'use strict';

var Promise     = require('bluebird');
var controller  = require('../../controller');
var errors      = require('../../errors');
var using       = Promise.using;

var Projects    = require('../../collections/Projects');
var projects    = new Projects();

function prepare(record) {
	return record;
}

module.exports = function(config, resources) {
	return {
		query: function(req, res, next) {

			// parse the query
			var query = controller.parseQuery(req.query);

			// get the project
			return using(resources.db.disposer(), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// query the invitations
				.then(function(project) {
					return project.invitations.query(conn, query);
				});
			})

			.then(function(invitations) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					projects.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(invitations));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		get: function(req, res, next) {

			// get the project
			return using(resources.db.disposer(), function(conn) {
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// get the invitation
				.then(function(project){
					return project.invitations.get(conn, req.params.invitation);
				});
			})

			.then(function(invitation) {
				res.send(prepare(invitation));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		save: function(req, res, next) {
			return res.status(405).send();
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.invitation)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// get the invitation
				.then(function(project){
					return project.invitations.get(conn, req.params.invitation);
				})

				// update the invitation
				.then(function(invitation){
					return invitation.update(conn, req.body);
				});
			})
			.then(function(invitation) {
				res.send(prepare(invitation));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {

				if(req.body.id !== req.params.invitation)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// create the invitation
				.then(function(project){
					return project.invitations.create(conn, req.body);
				});
			})

			.then(function(invitation) {

				// send the response
				res.status(201).send(prepare(invitation));

				// email the invitee behind the scenes
				var token = 'project/' + invitation.parent.id + '/' + invitation.id;
				if(invitation.email) return resources.mail({
					to: invitation.email,
					subject: 'Invitation to collaborate',
					html:
                                                '<p>Dear ' + invitation.name + ',</p>' +
                                                '<p>You have been invited to collaborate on the Neubauer Collegium project proposal, "' + invitation.parent.title + '".</p>' +
                                                '<p>Please use the following link and token to accept your invitation: <a href="' + req.protocol + '://' + (req.headers.host || req.hostname) + config.root + '/#/?invitation=' + token + '">' + 'link here</a>.  (You will need to submit by clicking “Go!” after you follow this link.)</p>' +
                                                '<hr>' +
                                                '<p>If the invitation code is not automaticully populated, please use the following code:' +
                                                '<pre style="display: inline-block; border: 1px solid #D2D2D2; padding: 4px 6px; background-color: #F7F7F7; border-radius: 4px;">' + token + '</pre>'

				});
			})
			.catch(function(err) {
				return next(err);
			});
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('projects:' + req.params.project, 1000), function(conn) {

				// get the project
				return projects.get(
					conn,
					req.params.project,
					req.admin || req.user
				)

				// get the invitation
				.then(function(project) {
					return project.invitations.get(conn, req.params.invitation);
				})

				// delete the invitation
				.then(function(invitation){
					return invitation.delete(conn);
				});
			})
			.then(function(project) {
				res.send(prepare(project));
			})
			.catch(function(err) {
				return next(err);
			});
		}

	};
};
