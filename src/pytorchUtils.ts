import { IVpc } from '@aws-cdk/aws-ec2';
import { ICluster } from '@aws-cdk/aws-ecs';
import { ApplicationListener, ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Key } from '@aws-cdk/aws-kms';
import { LogGroup } from '@aws-cdk/aws-logs';
import { Bucket } from '@aws-cdk/aws-s3';

/**
 * construct properties for EksUtils
 */
export interface PyTorchServiceProps {
  /**
   * Vpc for the Service
   * @default - create a new VPC or use existing one
   */
  readonly vpc: IVpc;

  /**
   * Cluster ECS
   */
  readonly cluster: ICluster;

  /**
   * KMS Key to encrypt SSM sessions and bucket
   * @default - public.ecr.aws/d7p2r8s3/apisix
   */
  readonly kmsKey: Key;

  /**
   * Bucket to store ecs exec commands
   * @default -
   */
  readonly execBucket: Bucket;

  /**
   * Log group to log ecs exec commands
   * @default - '/ecs/secu/exec/' + cluster.clusterName,
   */
  readonly execLogGroup: LogGroup;

  /**
   * *
   * Optional Listener
   */
  readonly domainZone?: string;

  /**
   * *
   * Optional Listener
   */
  readonly listener?: ApplicationListener;

  /**
   * *
   * Optional Application oad Balancer
   */
  readonly alb?: ApplicationLoadBalancer;
}
