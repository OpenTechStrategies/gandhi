'use strict';

var util = require('util');
var errors = require('../../errors');
var EmbeddedModel = require('../../EmbeddedModel');


// Schema Validator
// ----------------

var validator = require('jjv')();
validator.addSchema(require('../../schemas/project'));


// EmbeddedModel Constructor
// -------------------------

function Content (data, parent) {
	return EmbeddedModel.call(this, data, parent)
	.then(function(self) {

		// check authorizations
		if(!self.parent.authorizations['project/contents:read'])
			return Promise.reject(new errors.ForbiddenError());

		// get the corresponding stage
		return self.parent.cycle.stages.get(self.id)
		.then(function(stage) {

			// calculate visibility
			self.visible = self.parent.allows(stage.visible);

			// calculate authorizations
			self.authorizations = {};
			for (var p in stage.component.permissions) {
				self.authorizations[p] = self.parent.allows(stage.component.permissions[p]);
			}

			// pass to the component
			return Content.components[stage.component.name].content.read(self, stage);
		});
	});
}


// EmbeddedModel Configuration
// ---------------------------

Content.key = 'contents';
Content.collections = {};
Content.validate = function(data) {
	return validator.validate('http://www.gandhi.io/schema/project#/definitions/content', data, {useDefault: true, removeAdditional: true});
};
Content.create = function(conn, data, parent) {
	
	if(!parent.authorizations['project/contents:write'])
		return Promise.reject(new errors.ForbiddenError());

	var err = Content.validate(data);
	if(err) return Promise.reject(new errors.ValidationError('The input is invalid.', err));

	return new Content(data, parent)
	.then(function(content) {
		return content.save(conn);
	});
};

// This is populated by the app on setup, and contains globally accessible components
// TODO: this feels really dirty, and breaks some of the separation of responsibility
// that the models provide. I need to think through a cleaner way to configure this.
Content.components = {};


// Public Methods
// --------------

util.inherits(Content, EmbeddedModel);


// check authorizations for update
Content.prototype.update = function(conn, delta) {
	var self = this;

	if(!self.parent.authorizations['project/contents:write'])
		return Promise.reject(new errors.ForbiddenError());

	// pass to the component
	return self.parent.cycle.stages.get(self.id).then(function(stage) {
		return Content.components[stage.component.name].content.write(delta, self, stage);
	})
	.then(function(delta) {
		return EmbeddedModel.prototype.update.call(self, conn, delta);
	});

};

// check authorizations for delete
Content.prototype.delete = function(conn) {
	var self = this;

	if(!self.parent.authorizations['project/contents:write'])
		return Promise.reject(new errors.ForbiddenError());

	return EmbeddedModel.prototype.delete.call(this, conn);
};


module.exports = Content;