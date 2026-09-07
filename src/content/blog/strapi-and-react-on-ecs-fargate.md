---
title: Strapi and React on ECS Fargate, written down as Terraform
date: 2025-02-18
summary: Notes from putting a headless CMS and its frontend on Fargate — the network layout, the two IAM roles people confuse, and the health check settings that caused every early failure.
tags: ["AWS", "Terraform", "Docker"]
accent: green
---

Fargate removes the part of ECS I did not want to own: there is no cluster of
EC2 instances to patch, scale or drain. You describe a task, ECS finds somewhere
to run it. What is left is networking, IAM, and the several places where a small
mismatch stops a container from ever passing a health check.

## The network

Two availability zones, four subnets:

- **Public subnets** hold the Application Load Balancer and the NAT gateway.
- **Private subnets** hold the tasks. Nothing in them has a public IP.

Outbound traffic — pulling the image from ECR, calling the database, fetching
anything from the internet — leaves through the NAT gateway. Inbound traffic
only ever arrives via the ALB. The security groups encode exactly that:

```hcl
resource "aws_security_group" "tasks" {
  name   = "${var.name}-tasks"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

The `security_groups` reference on the ingress rule rather than a CIDR block is
the important detail. It means the tasks accept traffic from the load balancer
specifically, not from anything that happens to share the subnet range.

## Two roles, not one

This is where I lost the most time. ECS tasks have two separate IAM roles and
they are not interchangeable:

- The **execution role** is assumed by the ECS agent, before your container
  starts. It needs `ecr:GetAuthorizationToken`, the ECR pull permissions, and
  `logs:CreateLogStream` / `logs:PutLogEvents`. Without it, the task dies with a
  pull error and no application logs at all, because logging was one of the
  things it could not set up.
- The **task role** is assumed by your application code at runtime. If Strapi
  needs to write uploads to S3, that permission goes here.

Putting S3 access on the execution role appears to work in the sense that
Terraform applies cleanly. The container then gets a 403 the first time it tries
to upload, and the failure looks nothing like an IAM problem.

## The task definition

```hcl
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "strapi"
      image     = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
      essential = true

      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url.arn }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "strapi"
        }
      }
    }
  ])
}
```

Two things worth copying from this. `secrets` rather than `environment` means
the database URL is pulled from SSM Parameter Store at start time and never
appears in the task definition, in Terraform state as plaintext, or in the
console. And `image_tag` is a variable rather than `latest`, so a rollback is
`terraform apply -var image_tag=<previous>` instead of a rebuild.

## Health checks

Every early deployment failed the same way: tasks started, the ALB marked them
unhealthy, ECS killed them, ECS started replacements, and the loop continued
until I stopped it. Three causes, in the order I found them.

1. **The health check path did not exist.** The target group defaulted to `/`,
   which on Strapi returns a redirect, not a 200. Pointing it at a route that
   actually answers fixed the first round.
2. **The port was wrong in one place.** The container listened on 1337, the
   target group checked 80. With `awsvpc` networking the target group port has
   to match the container port exactly.
3. **Strapi was still booting.** It takes noticeably longer than the default
   grace period to become ready, so the first check arrived before the process
   was listening.

```hcl
resource "aws_ecs_service" "api" {
  name                              = "${var.name}-api"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.api.arn
  desired_count                     = 2
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 120

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "strapi"
    container_port   = var.container_port
  }
}
```

`health_check_grace_period_seconds` is the setting I would tell anyone starting
on Fargate to look at first. It tells ECS to ignore load balancer health for the
first two minutes of a task's life, which is the difference between a slow start
and an infinite crash loop.

## What this bought

Deployment became one command against one source of truth. The pieces that used
to live in someone's memory — which subnet, which security group, which role —
are now in a repository with a diff. Rolling back is changing a tag. And because
the whole environment is described rather than clicked, standing up a second one
for staging was a `terraform workspace` away rather than an afternoon.
