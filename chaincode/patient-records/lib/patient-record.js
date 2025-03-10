'use strict';
const { Contract } = require('fabric-contract-api');
class PatientRecord extends Contract {
    async initLedger(ctx) {
        await ctx.stub.createCompositeKey('patientRecordIndex', ['']);
        await ctx.stub.createCompositeKey('accessControlIndex', ['']);
        await ctx.stub.createCompositeKey('auditTrailIndex', ['']);
        return { status: 'success', message: 'Ledger initialized successfully' };
    }

    async registerPatientRecord(ctx, patientId, dataHash, metadata, ownerMSPID) {
        if (!patientId || !dataHash) {
            throw new Error('Patient ID and data hash are required');
        }
        
        const recordKey = ctx.stub.createCompositeKey('patientRecord', [patientId]);
        const existingRecord = await ctx.stub.getState(recordKey);
        if (existingRecord && existingRecord.length > 0) {
            throw new Error(`Patient record with ID ${patientId} already exists`);
        }
        
        let metadataObj;
        try {
            metadataObj = JSON.parse(metadata);
        } catch (err) {
            throw new Error('Invalid metadata format. Must be a valid JSON string');
        }
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        const txId = ctx.stub.getTxID();
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        const submitterMSPID = clientIdentity.getMSPID();
        
        const patientRecord = {
            patientId,
            dataHash,
            metadata: metadataObj,
            ownerMSPID: ownerMSPID || submitterMSPID,
            createdAt: timestamp,
            updatedAt: timestamp,
            version: 1,
            status: 'ACTIVE',
            txId,
            submitter
        };
        
        await ctx.stub.putState(recordKey, Buffer.from(JSON.stringify(patientRecord)));
        await this._createAuditEntry(ctx, patientId, 'REGISTER', dataHash, null, submitter, timestamp);
        await this._setAccessControl(ctx, patientId, submitter, ['READ', 'UPDATE', 'DELETE', 'GRANT'], null);
        
        return { 
            status: 'success', 
            message: `Patient record ${patientId} registered successfully`,
            txId,
            timestamp
        };
    }

    async updatePatientRecord(ctx, patientId, newDataHash, previousHash, metadata) {
        if (!patientId || !newDataHash) {
            throw new Error('Patient ID and new data hash are required');
        }
        
        const recordKey = ctx.stub.createCompositeKey('patientRecord', [patientId]);
        const recordBytes = await ctx.stub.getState(recordKey);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Patient record with ID ${patientId} does not exist`);
        }
        
        const record = JSON.parse(recordBytes.toString());
        
        if (previousHash && record.dataHash !== previousHash) {
            throw new Error('Data integrity error: Previous hash does not match current record');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        const hasAccess = await this._checkAccess(ctx, patientId, submitter, 'UPDATE');
        if (!hasAccess) {
            throw new Error(`Submitter ${submitter} does not have UPDATE permission for patient ${patientId}`);
        }
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        const txId = ctx.stub.getTxID();
        
        if (metadata) {
            try {
                const metadataObj = JSON.parse(metadata);
                record.metadata = { ...record.metadata, ...metadataObj };
            } catch (err) {
                throw new Error('Invalid metadata format. Must be a valid JSON string');
            }
        }
        
        record.dataHash = newDataHash;
        record.updatedAt = timestamp;
        record.version += 1;
        record.txId = txId;
        record.submitter = submitter;
        
        await ctx.stub.putState(recordKey, Buffer.from(JSON.stringify(record)));
        await this._createAuditEntry(ctx, patientId, 'UPDATE', newDataHash, record.dataHash, submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Patient record ${patientId} updated successfully`,
            txId,
            timestamp,
            version: record.version
        };
    }

    async verifyPatientRecord(ctx, patientId, dataHash) {
        if (!patientId || !dataHash) {
            throw new Error('Patient ID and data hash are required');
        }
        
        const recordKey = ctx.stub.createCompositeKey('patientRecord', [patientId]);
        const recordBytes = await ctx.stub.getState(recordKey);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Patient record with ID ${patientId} does not exist`);
        }
        
        const record = JSON.parse(recordBytes.toString());
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        const hasAccess = await this._checkAccess(ctx, patientId, submitter, 'READ');
        if (!hasAccess) {
            throw new Error(`Submitter ${submitter} does not have READ permission for patient ${patientId}`);
        }
        
        const isValid = record.dataHash === dataHash;
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        
        await this._createAuditEntry(ctx, patientId, 'VERIFY', dataHash, null, submitter, timestamp);
        
        return { 
            status: 'success', 
            isValid,
            message: isValid ? 'Record hash verification successful' : 'Record hash verification failed',
            timestamp
        };
    }

    async getPatientRecord(ctx, patientId) {
        if (!patientId) {
            throw new Error('Patient ID is required');
        }
        
        const recordKey = ctx.stub.createCompositeKey('patientRecord', [patientId]);
        const recordBytes = await ctx.stub.getState(recordKey);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Patient record with ID ${patientId} does not exist`);
        }
        
        const record = JSON.parse(recordBytes.toString());
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        const hasAccess = await this._checkAccess(ctx, patientId, submitter, 'READ');
        if (!hasAccess) {
            throw new Error(`Submitter ${submitter} does not have READ permission for patient ${patientId}`);
        }
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        
        await this._createAuditEntry(ctx, patientId, 'READ', null, null, submitter, timestamp);
        
        return record;
    }

    async deletePatientRecord(ctx, patientId) {
        if (!patientId) {
            throw new Error('Patient ID is required');
        }
        
        const recordKey = ctx.stub.createCompositeKey('patientRecord', [patientId]);
        const recordBytes = await ctx.stub.getState(recordKey);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Patient record with ID ${patientId} does not exist`);
        }
        
        const record = JSON.parse(recordBytes.toString());
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        const hasAccess = await this._checkAccess(ctx, patientId, submitter, 'DELETE');
        if (!hasAccess) {
            throw new Error(`Submitter ${submitter} does not have DELETE permission for patient ${patientId}`);
        }
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        const txId = ctx.stub.getTxID();
        
        record.status = 'INACTIVE';
        record.updatedAt = timestamp;
        record.version += 1;
        record.txId = txId;
        record.submitter = submitter;
        
        await ctx.stub.putState(recordKey, Buffer.from(JSON.stringify(record)));
        await this._createAuditEntry(ctx, patientId, 'DELETE', null, null, submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Patient record ${patientId} deleted successfully`,
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
        
        const hasAccess = await this._checkAccess(ctx, patientId, submitter, 'READ');
        if (!hasAccess) {
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

    async _createAuditEntry(ctx, patientId, action, newHash, previousHash, submitter, timestamp) {
        const txId = ctx.stub.getTxID();
        
        const auditEntry = {
            docType: 'auditTrail',
            patientId,
            action,
            newHash,
            previousHash,
            submitter,
            timestamp,
            txId
        };
        
        const auditKey = ctx.stub.createCompositeKey('auditTrail', [patientId, txId]);
        await ctx.stub.putState(auditKey, Buffer.from(JSON.stringify(auditEntry)));
    }

    async _setAccessControl(ctx, patientId, identity, permissions, expiryDate) {
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, identity]);
        
        const accessControl = {
            docType: 'accessControl',
            patientId,
            identity,
            permissions,
            expiryDate,
            createdAt: new Date().toISOString(),
            createdBy: ctx.clientIdentity.getID()
        };
        
        await ctx.stub.putState(accessControlKey, Buffer.from(JSON.stringify(accessControl)));
    }

    async _checkAccess(ctx, patientId, identity, permission) {
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, identity]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            return false;
        }
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        
        if (accessControl.expiryDate) {
            const now = new Date();
            const expiry = new Date(accessControl.expiryDate);
            if (now > expiry) {
                return false;
            }
        }
        
        return accessControl.permissions.includes(permission);
    }

    async grantAccess(ctx, patientId, granteeId, permissionsStr, expiryDate) {
        if (!patientId || !granteeId || !permissionsStr) {
            throw new Error('Patient ID, grantee ID, and permissions are required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        const hasAccess = await this._checkAccess(ctx, patientId, submitter, 'GRANT');
        if (!hasAccess) {
            throw new Error(`Submitter ${submitter} does not have GRANT permission for patient ${patientId}`);
        }
        
        const permissions = permissionsStr.split(',').map(p => p.trim().toUpperCase());
        
        await this._setAccessControl(ctx, patientId, granteeId, permissions, expiryDate);
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        
        await this._createAuditEntry(ctx, patientId, 'GRANT_ACCESS', null, null, submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Access granted to ${granteeId} for patient ${patientId}`,
            permissions,
            expiryDate
        };
    }

    async revokeAccess(ctx, patientId, granteeId) {
        if (!patientId || !granteeId) {
            throw new Error('Patient ID and grantee ID are required');
        }
        
        const clientIdentity = ctx.clientIdentity;
        const submitter = clientIdentity.getID();
        
        const hasAccess = await this._checkAccess(ctx, patientId, submitter, 'GRANT');
        if (!hasAccess) {
            throw new Error(`Submitter ${submitter} does not have GRANT permission for patient ${patientId}`);
        }
        
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, granteeId]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            throw new Error(`No access control entry found for grantee ${granteeId} on patient ${patientId}`);
        }
        
        await ctx.stub.deleteState(accessControlKey);
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        
        await this._createAuditEntry(ctx, patientId, 'REVOKE_ACCESS', null, null, submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Access revoked from ${granteeId} for patient ${patientId}`
        };
    }
}

module.exports = PatientRecord;
