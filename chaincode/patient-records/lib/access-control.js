'use strict';
const { Contract } = require('fabric-contract-api');

class AccessControl extends Contract {
    async initLedger(ctx) {
        await ctx.stub.createCompositeKey('accessControlIndex', ['']);
        return { status: 'success', message: 'Access Control ledger initialized successfully' };
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
        const validPermissions = ['READ', 'UPDATE', 'DELETE', 'GRANT'];
        
        for (const permission of permissions) {
            if (!validPermissions.includes(permission)) {
                throw new Error(`Invalid permission: ${permission}. Valid permissions are: ${validPermissions.join(', ')}`);
            }
        }
        
        await this._setAccessControl(ctx, patientId, granteeId, permissions, expiryDate);
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        const txId = ctx.stub.getTxID();
        
        await this._createAuditEntry(ctx, patientId, 'GRANT_ACCESS', granteeId, permissions.join(','), submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Access granted to ${granteeId} for patient ${patientId}`,
            permissions,
            expiryDate,
            txId
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
        const txId = ctx.stub.getTxID();
        
        await this._createAuditEntry(ctx, patientId, 'REVOKE_ACCESS', granteeId, null, submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Access revoked from ${granteeId} for patient ${patientId}`,
            txId
        };
    }

    async getAccessControlList(ctx, patientId) {
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
                docType: 'accessControl',
                patientId: patientId
            }
        };
        
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const accessList = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const value = JSON.parse(result.value.value.toString('utf8'));
            accessList.push(value);
            result = await iterator.next();
        }
        
        await iterator.close();
        
        return accessList;
    }

    async checkAccess(ctx, patientId, identity, permission) {
        if (!patientId || !identity || !permission) {
            throw new Error('Patient ID, identity, and permission are required');
        }
        
        const hasAccess = await this._checkAccess(ctx, patientId, identity, permission);
        
        return {
            patientId,
            identity,
            permission,
            hasAccess
        };
    }

    async updateAccessExpiry(ctx, patientId, granteeId, expiryDate) {
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
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        accessControl.expiryDate = expiryDate;
        accessControl.updatedAt = new Date().toISOString();
        accessControl.updatedBy = submitter;
        
        await ctx.stub.putState(accessControlKey, Buffer.from(JSON.stringify(accessControl)));
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        
        await this._createAuditEntry(ctx, patientId, 'UPDATE_ACCESS_EXPIRY', granteeId, expiryDate, submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Access expiry updated for ${granteeId} on patient ${patientId}`,
            expiryDate
        };
    }

    async updateAccessPermissions(ctx, patientId, granteeId, permissionsStr) {
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
        const validPermissions = ['READ', 'UPDATE', 'DELETE', 'GRANT'];
        
        for (const permission of permissions) {
            if (!validPermissions.includes(permission)) {
                throw new Error(`Invalid permission: ${permission}. Valid permissions are: ${validPermissions.join(', ')}`);
            }
        }
        
        const accessControlKey = ctx.stub.createCompositeKey('accessControl', [patientId, granteeId]);
        const accessControlBytes = await ctx.stub.getState(accessControlKey);
        
        if (!accessControlBytes || accessControlBytes.length === 0) {
            throw new Error(`No access control entry found for grantee ${granteeId} on patient ${patientId}`);
        }
        
        const accessControl = JSON.parse(accessControlBytes.toString());
        accessControl.permissions = permissions;
        accessControl.updatedAt = new Date().toISOString();
        accessControl.updatedBy = submitter;
        
        await ctx.stub.putState(accessControlKey, Buffer.from(JSON.stringify(accessControl)));
        
        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds.low * 1000).toISOString();
        
        await this._createAuditEntry(ctx, patientId, 'UPDATE_ACCESS_PERMISSIONS', granteeId, permissions.join(','), submitter, timestamp);
        
        return { 
            status: 'success', 
            message: `Access permissions updated for ${granteeId} on patient ${patientId}`,
            permissions
        };
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

    async _createAuditEntry(ctx, patientId, action, targetIdentity, details, submitter, timestamp) {
        const txId = ctx.stub.getTxID();
        
        const auditEntry = {
            docType: 'accessAudit',
            patientId,
            action,
            targetIdentity,
            details,
            submitter,
            timestamp,
            txId
        };
        
        const auditKey = ctx.stub.createCompositeKey('accessAudit', [patientId, txId]);
        await ctx.stub.putState(auditKey, Buffer.from(JSON.stringify(auditEntry)));
    }
}

module.exports = AccessControl;
