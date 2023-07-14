// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {IVpc} from 'aws-cdk-lib/aws-ec2';
import {ICluster} from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import ec2 = require('aws-cdk-lib/aws-ec2');
import ecs = require('aws-cdk-lib/aws-ecs');

export interface EcsCanaryClusterProps {
    readonly cidr?: string;
}

export class EcsCanaryCluster extends Construct {

    public readonly vpc: IVpc;
    public readonly cluster: ICluster;

    constructor(scope: Construct, id: string, props: EcsCanaryClusterProps = {}) {
        super(scope, id);

        this.vpc = new ec2.Vpc(this, 'ecsDemoVPC', {
            ipAddresses: ec2.IpAddresses.cidr(props.cidr!),
            natGateways: 1,
            vpcName: 'ecsDemoVPC'
        });

        this.cluster = new ecs.Cluster(this, 'ecsDemoCluster', {
            vpc: this.vpc,
            containerInsights: true,
            clusterName: 'ecsDemoCluster',
            enableFargateCapacityProviders: true
        });
    }
}