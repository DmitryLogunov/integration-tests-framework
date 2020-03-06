import express from 'express';
import http from 'http';
import terminus from '@godaddy/terminus';
import yaml from 'node-yaml';
import * as logger from './components/logger';
import stackTrace from 'stack-trace';
import {FeatureParams} from "../common.types";

const path = require('path');
const fs = require('fs');
import _ from 'lodash';

const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);

/**
 * Loading local config
 */
export const loadLocalConfig = async () => {
  const pathToConfig = '../config.yml';
  logger.info('Retrieve local config', {pathToConfig}, stackTrace.get());

  try {
    const localConfig = await yaml.read(pathToConfig);

    if (!localConfig) {
      logger.error(`Check local config. Something wrong with it`, {pathToConfig}, stackTrace.get());
      return null;
    }

    if (!localConfig.service_name) {
      logger.error(`Check local config: service_name is required`, {localConfig, pathToConfig}, stackTrace.get());
      return null;
    }

    return localConfig;
  } catch (e) {
    logger.error(`Check local config. Something wrong with it..`, {error: e.message, pathToConfig}, stackTrace.get());
    return null;
  }
};

/**
 *  start cleanup of resource, like databases or file descriptors
 * @returns {Promise<void>}
 */
const onSignal = () => {
  logger.info('Server is starting cleanup', {}, stackTrace.get());
  return Promise.resolve();
};

/**
 * checks if the system is healthy, like the db connection is live resolves, if health, rejects if not
 * @returns {Promise<void>}
 */
const onHealthCheck = () => {
  return Promise.resolve();
};

/**
 * waiting for some time (TIME_TO_TERMINATE_MS ms), if config data is not retrieved from consul -> terminate the process
 */
const TIME_TO_TERMINATE_MS = 10000;

export const checkConfigData = () => {
  logger.debug(`Terminate process as no data from consul are loaded for ${TIME_TO_TERMINATE_MS / 1000} seconds`, {}, stackTrace.get());

  setTimeout(() => {
    if (typeof global.config === 'undefined') {
      logger.error("Config hasn't been loaded. Service cannot continue to work so will be terminated.", {}, stackTrace.get());
      process.exit(1);
    }
  }, TIME_TO_TERMINATE_MS);
};

/**
 *  startTerminus(app) - start terminus server
 *
 * @param {Express instance} app - express aplication
 */
export const startTerminus = (app: express.Application) => {
  terminus(http.createServer(app), {
    timeout: 1000, // number of milliseconds before forcefull exiting
    signals: ['SIGINT', 'SIGTERM'],
    healthChecks: {
      '/healthCheck': onHealthCheck
    },
    logger: (msg, err) => {
      logger.error(msg, {err}, stackTrace.get());
    },
    onSignal
  }).listen(process.env.SERVER_PORT, () => {
    logger.info('Tests service http-server has started', {port: process.env.SERVER_PORT}, stackTrace.get());
  });
};

/**
 *
 * @returns {Promise<void>}
 */
export const buildFeatures = async () => {
  const testsFeaturesPath = path.resolve(__dirname + '/../tests/features');
  const features = await readDir(testsFeaturesPath);

  if (_.isEmpty(features)) {
    return;
  }

  for (const feature of features) {
    try {
      const featureYMLTemplate = `${testsFeaturesPath}/${feature}/${feature}.feature.yml`;
      if (!fs.existsSync(featureYMLTemplate)) {
        continue;
      }

      const featuresFromYML = await yaml.read(featureYMLTemplate);

      if (typeof featuresFromYML !== 'object' || _.isEmpty(featuresFromYML)) {
        continue;
      }

      if (!_.has(featuresFromYML, 'length')) {
        parseAndBuildFeature(feature, featuresFromYML.feature);
        continue;
      }

      for (const featureParams of featuresFromYML) {
        parseAndBuildFeature(feature, featureParams.feature);
      }
    } catch (error) {
      logger.error("Error with parsing feature yml template", {feature});

    }
  }
};

/**
 *
 * @param {object} feature
 */
const parseAndBuildFeature = (feature: string, featureParams: FeatureParams) => {
  let requiredServices = [];

  if (typeof featureParams.required_services === 'object' && _.has(featureParams.required_services, 'length')) {
    requiredServices = featureParams.required_services;
  }
  if (typeof featureParams.required_services === 'string') {
    requiredServices.push(featureParams.required_services);
  }

  logger.info(" ---- DEBUG --- feature", {featureParams, requiredServices});
};
