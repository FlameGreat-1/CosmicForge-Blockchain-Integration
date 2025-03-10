'use strict';
const { Contract } = require('fabric-contract-api');

class AuditTrail extends Contract {
    async initLedger(ctx) {
        await ctx.stub.createCompositeKey('auditTrailIndex', ['']);
        return { status: 'success', message: 'Audit Trail ledger initialized successfully' };
    }

    async createAuditEntry(ctx, patientId, action, dataHash, previousHash, metadata) {
        if (!patientId || !action) {
            throw new Error('Patient ID and action are required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        const txId = ctx.stub.getTxID();
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        
        let metadataObj = {};
        if (metadata) {
            try {
                metadataObj = JSON.parse(metadata);
            } catch (err) {
                throw new Error('Invalid metadata format. Must be a valid JSON string');
            }
        }
        
        const auditEntry = {
            docType: 'auditTrail',
            patientId,
            action,
            dataHash,
            previousHash,
            metadata: metadataObj,
            submitter,
            timestamp,
            txId
        };
        
        const auditKey = ctx.stub.createCompositeKey('auditTrail', [patientId, txId]);
        await ctx.stub.putState(auditKey, Buffer.from(JSON.stringify(auditEntry)));
        
        return { 
            status: 'success', 
            message: `Audit entry created for patient ${patientId}`,
            txId,
            timestamp
        };
    }

    async getAuditTrail(ctx, patientId) {
        if (!patientId) {
            throw new Error('Patient ID is required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        // Check if the submitter has access to the patient's audit trail
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, submitter]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            throw new Error(`Submitter ${submitter} does not have access to patient ${patientId}`);
        }
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        if (!accessControl.permissions.includes('READ')) {
            throw new Error(`Submitter ${submitter} does not have READ permission for patient ${patientId}`);
        }
        
        const query = {
            selector: {
                docType: 'auditTrail',
                patientId: patientId
            },
            sort: [{ timestamp: 'desc' }]
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const auditTrail = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const value = JSON.parse(result.value.value.toString('utf8'));
            auditTrail.push(value);
            result = await iterator.next();
        }
        
        await iterator.close();
        
        return auditTrail;
    }

    async getAuditTrailByDateRange(ctx, patientId, startDate, endDate) {
        if (!patientId || !startDate || !endDate) {
            throw new Error('Patient ID, start date, and end date are required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        // Check if the submitter has access to the patient's audit trail
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, submitter]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            throw new Error(`Submitter ${submitter} does not have access to patient ${patientId}`);
        }
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        if (!accessControl.permissions.includes('READ')) {
            throw new Error(`Submitter ${submitter} does not have READ permission for patient ${patientId}`);
        }
        
        const startTimestamp = new Date(startDate).toISOString();
        const endTimestamp = new Date(endDate).toISOString();
        
        const query = {
            selector: {
                docType: 'auditTrail',
                patientId: patientId,
                timestamp: {
                    $gte: startTimestamp,
                    $lte: endTimestamp
                }
            },
            sort: [{ timestamp: 'desc' }]
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const auditTrail = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const value = JSON.parse(result.value.value.toString('utf8'));
            auditTrail.push(value);
            result = await iterator.next();
        }
        
        await iterator.close();
        
        return auditTrail;
    }

    async getAuditTrailByAction(ctx, patientId, action) {
        if (!patientId || !action) {
            throw new Error('Patient ID and action are required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        // Check if the submitter has access to the patient's audit trail
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, submitter]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            throw new Error(`Submitter ${submitter} does not have access to patient ${patientId}`);
        }
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        if (!accessControl.permissions.includes('READ')) {
            throw new Error(`Submitter ${submitter} does not have READ permission for patient ${patientId}`);
        }
        
        const query = {
            selector: {
                docType: 'auditTrail',
                patientId: patientId,
                action: action
            },
            sort: [{ timestamp: 'desc' }]
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const auditTrail = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const value = JSON.parse(result.value.value.toString('utf8'));
            auditTrail.push(value);
            result = await iterator.next();
        }
        
        await iterator.close();
        
        return auditTrail;
    }

    async getAuditTrailBySubmitter(ctx, patientId, submitterId) {
        if (!patientId || !submitterId) {
            throw new Error('Patient ID and submitter ID are required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        // Check if the submitter has access to the patient's audit trail
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, submitter]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            throw new Error(`Submitter ${submitter} does not have access to patient ${patientId}`);
        }
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        if (!accessControl.permissions.includes('READ')) {
            throw new Error(`Submitter ${submitter} does not have READ permission for patient ${patientId}`);
        }
        
        const query = {
            selector: {
                docType: 'auditTrail',
                patientId: patientId,
                submitter: submitterId
            },
            sort: [{ timestamp: 'desc' }]
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const auditTrail = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const value = JSON.parse(result.value.value.toString('utf8'));
            auditTrail.push(value);
            result = await iterator.next();
        }
        
        await iterator.close();
        
        return auditTrail;
    }

    async getAuditEntryByTxId(ctx, patientId, txId) {
        if (!patientId || !txId) {
            throw new Error('Patient ID and transaction ID are required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        // Check if the submitter has access to the patient's audit trail
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, submitter]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            throw new Error(`Submitter ${submitter} does not have access to patient ${patientId}`);
        }
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        if (!accessControl.permissions.includes('READ')) {
            throw new Error(`Submitter ${submitter} does not have READ permission for patient ${patientId}`);
        }
        
        const auditKey = ctx.stub.createCompositeKey('auditTrail', [patientId, txId]);
        const auditBytes = await ctx.stub.getState(auditKey);
        
        if (!auditBytes || auditBytes.length === 0) {
            throw new Error(`Audit entry with transaction ID ${txId} for patient ${patientId} does not exist`);
        }
        
        return JSON.parse(auditBytes.toString());
    }
}

module.exports = AuditTrail;
