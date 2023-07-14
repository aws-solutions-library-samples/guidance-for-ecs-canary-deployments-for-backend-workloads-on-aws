// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';

import lambda = require('aws-cdk-lib/aws-lambda');
import events = require('aws-cdk-lib/aws-events')
import event_target = require('aws-cdk-lib/aws-events-targets');
import cw = require('aws-cdk-lib/aws-cloudwatch');
import { Role } from 'aws-cdk-lib/aws-iam';

export interface LambdaProps {
    readonly codePipelineName?: string;
    readonly cwalarm?: cw.Alarm;
    readonly ecsCluster?: string;
    readonly ecsSvcArn?: string;
    readonly ecsCanarySvcArn?: string;
    readonly customLambdaRoleArn?: string;
}

export class Lambda extends Construct {

    constructor(scope: Construct, id: string, props: LambdaProps) {
        super(scope, id);

        const ecsCanaryLambda = new lambda.Function(this, 'ecsCanaryLambda', {
            code: lambda.Code.fromAsset(
                path.join(__dirname, '.'),
                {
                    exclude: ['**', '!lambda_function.py']
                }),
            runtime: lambda.Runtime.PYTHON_3_10,
            handler: 'lambda_function.handler',
            role: Role.fromRoleArn(this, 'customLambdaRole', props.customLambdaRoleArn!),
            description: 'Custom resource to monitor ECS Canary Deployment',
            memorySize: 128,
            timeout: Duration.seconds(60),
            environment: {
                'CODEPIPELINE_NAME': props.codePipelineName!,
                'ECS_CLUSTER': props.ecsCluster!,
                'ECS_SVC_ARN': props.ecsSvcArn!,
                'ECS_CANARY_SVC_ARN': props.ecsCanarySvcArn!
            }
        });

        const rule = new events.Rule(this, 'ecsCanaryRule', {
            eventPattern: {
                source: ['aws.cloudwatch'],
                detailType: ['CloudWatch Alarm State Change'],
                resources: [props.cwalarm?.alarmArn!],
                detail: {
                    'state': {
                        'value': ['ALARM']
                    }
                }
            }
        });

        rule.addTarget(new event_target.LambdaFunction(ecsCanaryLambda));
    }
}