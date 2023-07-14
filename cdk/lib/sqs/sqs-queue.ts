// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { Duration, CfnOutput } from 'aws-cdk-lib';

import cloudWatch = require('aws-cdk-lib/aws-cloudwatch');
import sqs = require('aws-cdk-lib/aws-sqs');
import { Role, Effect } from 'aws-cdk-lib/aws-iam';
import iam = require('aws-cdk-lib/aws-iam');

export interface SQSQueueProps {
    readonly ecsTaskRoleArn?: string;
}

export class SQSQueue extends Construct {

    public readonly dlq: sqs.Queue;
    public readonly queue: sqs.Queue;
    public readonly cwalarm: cloudWatch.Alarm;

    constructor(scope: Construct, id: string, props: SQSQueueProps = {}) {
        super(scope, id);

        this.dlq = new sqs.Queue(this, 'AppDLQueue', {
            queueName: 'sample-app-dlq',
            visibilityTimeout: Duration.seconds(300),
            retentionPeriod: Duration.minutes(60)
        })

        this.queue = new sqs.Queue(this, 'AppQueue', {
            queueName: 'sample-app',
            visibilityTimeout: Duration.seconds(300),
            deadLetterQueue: {
                queue: this.dlq,
                maxReceiveCount: 1
            }
        })

        const inlinePolicyForEcsTasks = new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl'
            ],
            resources: [this.queue.queueArn]
        });

        const ecsTaskRole = <iam.Role> iam.Role.fromRoleArn(this, 'ecsTaskRole', props.ecsTaskRoleArn!, {
            mutable: true
        });
        ecsTaskRole?.addToPolicy(inlinePolicyForEcsTasks);

        const metric = new cloudWatch.Metric({
            namespace: 'AWS/SQS',
            metricName: 'ApproximateNumberOfMessagesVisible',
            dimensionsMap: {
                QueueName: this.dlq.queueName
            },
            statistic: cloudWatch.Stats.MAXIMUM,
            period: Duration.seconds(300)
        });

        this.cwalarm = new cloudWatch.Alarm(this, 'AppDLQAlarm', {
            alarmDescription: 'CloudWatch Alarm for the DLQ',
            metric: metric,
            threshold: 10,
            evaluationPeriods: 1
        });

        new CfnOutput(this, 'ecsCanaryDLQName', {
            description: 'Dead Letter Queue Name',
            exportName: 'canaryDLQ',
            value: this.dlq.queueName
        })

        new CfnOutput(this, 'ecsCanaryQueueName', {
            description: 'Queue Name',
            exportName: 'canaryQueue',
            value: this.queue.queueName
        })
    }
}