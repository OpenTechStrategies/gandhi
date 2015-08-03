'use strict';

var util = require('util');
var Q = require('q');
var errors = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/cycle'));


// EmbeddedModel Constructor
// -------------------------

function Trigger (data, parent) {
	return EmbeddedModel.call(this, data, parent);
}


// EmbeddedModel Configuration
// ---------------------------

Trigger.key = 'triggers';
Trigger.collections = {};
Trigger.validate = function(data) {};
Trigger.create = function(data, parent) {
	return new Trigger(data, parent);
};


// Public Methods
// --------------

util.inherits(Trigger, EmbeddedModel);


// TODO: check authorizations for cycle/assignments:write


module.exports = Trigger;