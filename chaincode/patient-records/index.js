'use strict';

const PatientRecord = require('./lib/patient-record');
const AccessControl = require('./lib/access-control');
const AuditTrail = require('./lib/audit-trail');

module.exports.PatientRecord = PatientRecord;
module.exports.AccessControl = AccessControl;
module.exports.AuditTrail = AuditTrail;

module.exports.contracts = [PatientRecord, AccessControl, AuditTrail];
