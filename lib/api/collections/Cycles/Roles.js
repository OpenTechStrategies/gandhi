'use strict';

var Promise = require('bluebird');
var util    = require('util');
var errors  = require('../../errors');

var EmbeddedCollection = require('../../EmbeddedCollection');
var Role = require('../../models/Cycle/Role');

function Roles (data, parent) {
	this.model = Role;
	EmbeddedCollection.call(this, data, parent);
}

util.inherits(Roles, EmbeddedCollection);

Roles.prototype.query = function(query) {
	var self = this;

	if(!self.parent.authorizations['cycle/roles:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.query.call(self, query);
};

Roles.prototype.get = function(id) {
	var self = this;

	if(!self.parent.authorizations['cycle/roles:read'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedCollection.prototype.get.call(self, id);
};

module.exports = Roles;