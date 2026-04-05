#!/usr/bin/env node

const reportStage =
  process.env.APP_OPERATION_REPORT_STAGE || process.env.PLATFORM_REPORT_STAGE || ''
const operationType =
  process.env.APP_OPERATION_TYPE || process.env.MANAGED_APP_OPERATION_TYPE || 'deploy'
const operationMeta =
  operationType === 'bootstrap'
    ? {
        label: 'Bootstrap',
        workflowFile: 'bootstrap-managed-app.yml',
        workflowName: 'Bootstrap Managed App',
      }
    : operationType === 'template-sync'
      ? {
          label: 'Template sync',
          workflowFile: 'deploy-main.yml',
          workflowName: 'Deploy From Main',
        }
      : {
          label: 'Deploy',
          workflowFile: 'deploy-main.yml',
          workflowName: 'Deploy From Main',
        }
const operationLabel = operationMeta.label

if (reportStage !== 'start' && reportStage !== 'outcome') {
  console.warn(
    'report-app-operation: APP_OPERATION_REPORT_STAGE must be "start" or "outcome"; skipping.',
  )
  process.exit(0)
}

const reportToken = process.env.OPERATION_REPORT_API_KEY || process.env.PROVISION_API_KEY || ''
if (!reportToken) {
  console.warn(
    'report-app-operation: no OPERATION_REPORT_API_KEY or PROVISION_API_KEY configured; skipping.',
  )
  process.exit(0)
}

const repository = process.env.GITHUB_REPOSITORY || ''
const sha = process.env.GITHUB_SHA || ''
const runId = process.env.GITHUB_RUN_ID || ''
const runNumber = process.env.GITHUB_RUN_NUMBER || runId
const serverUrl = process.env.GITHUB_SERVER_URL || 'https://code.platform.nard.uk'
const workflowFile = process.env.APP_OPERATION_WORKFLOW_FILE || operationMeta.workflowFile
const workflowName =
  process.env.APP_OPERATION_WORKFLOW_NAME ||
  process.env.GITHUB_WORKFLOW ||
  operationMeta.workflowName
const refName = process.env.GITHUB_REF_NAME || 'main'
const trigger = process.env.GITHUB_EVENT_NAME || 'push'
const reportBase =
  process.env.CONTROL_PLANE_URL || process.env.PLATFORM_APP_URL || 'https://platform.nard.uk'
const managedOperationId =
  process.env.MANAGED_APP_OPERATION_ID || process.env.APP_OPERATION_ID || ''
const managedAppSlug =
  process.env.MANAGED_APP_OPERATION_APP_SLUG || process.env.APP_OPERATION_APP_NAME || ''
const appName = managedAppSlug || repository.split('/').at(-1) || ''

if (!repository || !sha || !runId || !managedOperationId || !managedAppSlug) {
  console.warn(
    'report-app-operation: missing repository, sha, run id, or managed operation metadata; skipping.',
  )
  process.exit(0)
}

const reportUrl = `${reportBase.replace(/\/$/, '')}/api/callbacks/managed-app-operations/report`
const workflowStep = process.env.APP_OPERATION_STEP || workflowFile.replace(/\.[^.]+$/, '')
const externalUrl = `${serverUrl.replace(/\/$/, '')}/${repository}/actions/runs/${runNumber}`

const managedBaseBody = {
  id: managedOperationId,
  appSlug: managedAppSlug,
  externalSystem: 'forgejo',
  externalAction: workflowFile,
  externalUrl,
  step: workflowStep,
  logMeta: {
    workflow: workflowFile,
    workflowName,
    repository,
    runId,
    runNumber,
    ref: refName,
    trigger,
    environment: process.env.MANAGED_APP_OPERATION_ENVIRONMENT || null,
  },
}

const startBody = {
  ...managedBaseBody,
  status: 'running',
  externalSummary: `${operationLabel} workflow started for ${managedAppSlug} at ${sha.slice(0, 12)}.`,
  logMessage: `${operationLabel} workflow started for ${managedAppSlug} at ${sha.slice(0, 12)}.`,
  logLevel: 'info',
}

function buildOutcomeBody() {
  const jobStatus = process.env.JOB_STATUS || ''

  if (jobStatus === 'success') {
    return {
      ...managedBaseBody,
      status: 'succeeded',
      externalSummary: `${operationLabel} completed for ${managedAppSlug} at ${sha.slice(0, 12)}.`,
      logMessage: `${operationLabel} completed for ${managedAppSlug} at ${sha.slice(0, 12)}.`,
      logLevel: 'success',
    }
  }

  if (jobStatus === 'cancelled') {
    return {
      ...managedBaseBody,
      status: 'cancelled',
      externalSummary: `${operationLabel} workflow was canceled.`,
      logMessage: `${operationLabel} canceled for ${managedAppSlug} at ${sha.slice(0, 12)}.`,
      logLevel: 'warn',
    }
  }

  return {
    ...managedBaseBody,
    status: 'failed',
    externalSummary: `${operationLabel} workflow ended with ${jobStatus || 'unknown'}.`,
    logMessage: `${operationLabel} failed for ${managedAppSlug} at ${sha.slice(0, 12)}.`,
    logLevel: 'error',
  }
}

const body = reportStage === 'start' ? startBody : buildOutcomeBody()

const response = await fetch(reportUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${reportToken}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  body: JSON.stringify(body),
})

if (!response.ok) {
  const details = await response.text().catch(() => '')
  console.warn(`report-app-operation: callback failed (${response.status}) ${details}`.trim())
  process.exit(0)
}

console.log(`report-app-operation: reported ${reportStage} for ${appName}@${sha.slice(0, 12)}.`)
