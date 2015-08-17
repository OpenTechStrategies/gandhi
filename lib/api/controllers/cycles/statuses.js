'use strict';

var Promise     = require('bluebird');
var controller  = require('../../controller');
var errors      = require('../../errors');
var using       = Promise.using;

var Cycles      = require('../../collections/Cycles');
var cycles      = new Cycles();

function prepare(record) {
	return record;
}

module.exports = function(config, resources) {
	return {
		query: function(req, res, next) {
			
			// parse the query
			var query = controller.parseQuery(req.query);

			// get the cycle
			return using(resources.db.disposer(), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				);
			})

			// query the statuses
			.then(function(cycle) {
				return cycle.statuses.query(query);
			})

			.then(function(statuses) {

				// set pagination headers
				return res.set(controller.makePageHeaders(
					query.skip,
					query.limit,
					cycles.total,
					req.path,
					req.query
				))

				// send the results
				.send(prepare(statuses));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		get: function(req, res, next) {

			// get the cycle
			return using(resources.db.disposer(), function(conn) {
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				);
			})

			// get the status
			.then(function(cycle){
				return cycle.statuses.get(req.params.status);
			})

			.then(function(status) {
				res.send(prepare(status));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		save: function(req, res, next) {
			return res.status(405).send();
		},

		update: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				if(typeof req.body.id !== 'undefined' && req.body.id !== req.params.status)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the status
				.then(function(cycle){
					return cycle.statuses.get(req.params.status);
				})

				// update the status
				.then(function(status){
					return status.update(conn, req.body);
				});
			})
			.then(function(cycle) {
				res.send(prepare(cycle));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		create: function(req, res, next) {
			return using(resources.db.disposer(), function(conn) {

				if(req.body.id !== req.params.status)
					return Promise.reject(new errors.ValidationError('The `id` did not match the value passed in the URL.'));

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// create the status
				.then(function(cycle){
					return cycle.statuses.create(conn, req.body);
				});
			})

			.then(function(cycle) {
				res.status(200).send(prepare(cycle));
			})
			.catch(function(err) {
				return next(err);
			});
		},

		delete: function(req, res, next) {
			return using(resources.db.disposer(), resources.redlock.disposer('cycles:' + req.params.cycle, 1000), function(conn) {

				// get the cycle
				return cycles.get(
					conn,
					req.params.cycle,
					req.admin || req.user
				)

				// get the status
				.then(function(cycle) {
					return cycle.statuses.get(req.params.status);
				})

				// delete the status
				.then(function(status){
					return status.delete(conn);
				});
			})
			.then(function(cycle) {
				res.send(prepare(cycle));
			})
			.catch(function(err) {
				return next(err);
			});
		}

	};
};
