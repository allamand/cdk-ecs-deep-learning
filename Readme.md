# AWS Deep Learning Container Images demo using AWS ECS

Easily demonstrate the use of ECS with CPU or GPU instances in order to create training jobs, and create an inference endpoint.

The project, will create an ECS Cluster using Capacity provider with GPU instance (so that would cost money).
It created also an Application Load Balancer that points to the inference ECS Service.

It also outputs command for you to launch ECS training tasks on GPU instances.

## Deploy the architecture

1. Install projen

```bash
npm install projen
```

Generates project:

```bash
npx projen
#or create an alias
alias pj='npx projen'
```

2. Configure your deployment

```bash
export AWS_REGION=<your-region>
export CDK_STACK_NAME=cdk-eks-deep-learning # Name of the deployment
export DOMAIN_ZONE=<your-domain.com> # Name of your domain hosted zone in Route53
```

3. Create and deploy the stack

```bash
pj deploy
```

4. Cleanup

When done with the project you can free up your AWS resources

```bash
pj destroy
```