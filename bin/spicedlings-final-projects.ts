#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SpicedlingsFinalProjectsStack } from '../lib/spicedlings-final-projects-stack';

const app = new cdk.App();
new SpicedlingsFinalProjectsStack(app, 'SpicedlingsFinalProjectsStack');
