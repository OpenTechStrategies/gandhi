'use strict';

var util          = require('util');
var uuid          = require('../../utils/uuid');
var errors        = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/cycle'));


// EmbeddedModel Constructor
// -------------------------

function Stage (data, parent) {
	return EmbeddedModel.call(this, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['cycle/stages:read'])
			return Promise.reject(new errors.ForbiddenError());

		// pass to the component
		return Stage.components[self.component.name].stage.read(self);
	});
}


// EmbeddedModel Configuration
// ---------------------------

Stage.key = 'stages';
Stage.collections = {};
Stage.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/cycle#/definitions/stage', data, {useDefault: true, removeAdditional: true});
};
Stage.create = function(conn, data, parent) {
	
	if(!parent.authorizations['cycle/stages:write'])
		return Promise.reject(new errors.ForbiddenError());

	// generate a new uuid
	data.id = data.id || uuid();

	return new Stage(data, parent)
	.then(function(stage) {
		return stage.save(conn);
	});
};


// This is populated by the app on setup, and contains globally accessible components
// TODO: this feels really dirty, and breaks some of the separation of responsibility
// that the models provide. I need to think through a cleaner way to configure this.
Stage.components = {};


// Public Methods
// --------------

util.inherits(Stage, EmbeddedModel);


// check authorizations for update
Stage.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['cycle/stages:write'])
		return Promise.reject(new errors.ForbiddenError());

	// pass to the component
	return Promise.resolve().then(function() {
		return Stage.components[self.component.name].stage.write(delta, self);
	})
	.then(function(delta) {
		return EmbeddedModel.prototype.update.call(self, conn, delta);
	});
};

// check authorizations for delete
Stage.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['cycle/stages:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(self, conn);
};


module.exports = Stage;