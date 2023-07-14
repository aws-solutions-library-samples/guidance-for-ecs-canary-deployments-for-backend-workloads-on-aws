// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {RemovalPolicy, Stack} from 'aws-cdk-lib';
import {IRole} from 'aws-cdk-lib/aws-iam';
import {IVpc} from 'aws-cdk-lib/aws-ec2';
import {FargateService, ICluster} from 'aws-cdk-lib/aws-ecs';
import {IRepository} from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import ecs = require('aws-cdk-lib/aws-ecs');
import log = require('aws-cdk-lib/aws-logs');


export interface EcsCanaryServiceProps {
    readonly apiName?: string;
    readonly vpc?: IVpc;
    readonly cluster?: ICluster;
    readonly ecrRepository?: IRepository;
    readonly ecsTaskRole?: IRole;
    readonly ecsTaskExecutionRole?: IRole;
    readonly canaryPercentage?: number;
    readonly taskCount?: number;
    readonly queueName?: string;
}

export class EcsCanaryService extends Construct {

    private static readonly PREFIX: string = 'app';

    public readonly ecsService: FargateService;
    public readonly ecsCanaryService: FargateService;

    constructor(scope: Construct, id: string, props: EcsCanaryServiceProps = {}) {
        super(scope, id);

        // Creating the task definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'apiTaskDefinition', {
            family: props.apiName,
            cpu: 256,
            memoryLimitMiB: 1024,
            taskRole: props.ecsTaskRole,
            executionRole: props.ecsTaskExecutionRole,
        });
        taskDefinition.addContainer(props.apiName! || 'sample-app', {
            image: ecs.ContainerImage.fromEcrRepository(props.ecrRepository!),
            logging: new ecs.AwsLogDriver({
                logGroup: new log.LogGroup(this, 'apiLogGroup', {
                    logGroupName: '/ecs/'.concat(props.apiName!),
                    removalPolicy: RemovalPolicy.DESTROY
                }),
                streamPrefix: EcsCanaryService.PREFIX
            }),
            environment: {
                "AWS_REGION": Stack.of(this).region,
                "QUEUE": props.queueName!
            }
        })

        this.ecsService = new ecs.FargateService(this, 'ecsService', {
            cluster: props.cluster!,
            taskDefinition: taskDefinition,
            desiredCount: props.taskCount,
            serviceName: props.apiName!
        });

        this.ecsCanaryService = new ecs.FargateService(this, 'ecsCanaryService', {
            cluster: props.cluster!,
            taskDefinition: taskDefinition,
            desiredCount: Math.ceil(props.taskCount!/props.canaryPercentage!),
            serviceName: props.apiName! + '-canary'
        });

    }

}