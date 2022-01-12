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

4. Create Inference Job

from `pj deploy`output or by running `make describe` you can retrieve ecs command to run the training job example:

```
 aws ecs run-task --cluster cdk-eks-deep-learning2 --task-definition arn:aws:ecs:us-east-2:01234567890:task-definition/cdkeksdeeplearning2pytorchTrainingGPUTaskDefGPUpytorchTrainingGPU550CC673:1 --placement-constraints type=memberOf,expression="attribute:ecs.instance-type == p2.8xlarge" --network-configuration "awsvpcConfiguration={subnets=[subnet-0b9610d74638170b5,subnet-0a42c7a5d609c1730],securityGroups=[sg-0f1ac739839481215],assignPublicIp=DISABLED}"
 ```

5. The Inference endpoint should also be running and you can predictions on it

```
$ curl -X POST https://inference.my-domain.com/predictions/densenet -T samples/pismire-ant.jpg
[
  [
    "ant, emmet, pismire",
    99.95436096191406
  ],
  [
    "ground beetle, carabid beetle",
    0.03174210712313652
  ],
  [
    "tiger beetle",
    0.004751819651573896
  ],
  [
    "cockroach, roach",
    0.003679135348647833
  ],
  [
    "cricket",
    0.0023499533999711275
  ]
]
```

6. Cleanup

When done with the project you can free up your AWS resources

```bash
pj destroy
```