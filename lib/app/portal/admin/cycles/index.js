angular.module('gandhi')

.config(function($stateProvider) {
	'use strict';

	$stateProvider

	.state('portal.admin.cycles', {
		url: '/cycles',
		abstract: true,
		template: '<div ui-view></div>',
		controller: ['$scope', 'Cycle', function($scope, Cycle){
			$scope.table = {
				query: {
					sort: [{path: ['title'], direction: 'asc'}]
				},
				pages: {},
				columns: [
					{primary: true, title: 'Title', path: ['title']},
					{primary: true, title: 'Status', path: ['status_id'], template: '<span style="text-transform: capitalize;">{{row.status_id}}</span>'},
					{primary: false, title: 'Created', path: ['created'], template: '{{row.created * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'},
					{primary: false, title: 'Updated', path: ['updated'], template: '{{row.updated * 1000 | date:"yyyy.MM.dd - hh:mm a"}}'}
				]
			};

			function getCycles(query){
				Cycle.query(query || $scope.table.query, function(cycles, h){
					$scope.cycles = $scope.table.data = cycles;
					$scope.table.pages = JSON.parse(h('pages'));
				});
			}
			$scope.$on('Cycle', getCycles);
			$scope.$watch('table.query', getCycles, true);
		}]
	})

	.state('portal.admin.cycles.list', {
		url: '',
		templateUrl: 'portal/admin/cycles/list.html'
	})

	.state('portal.admin.cycles.create', {
		url: '/create',
		templateUrl: 'portal/admin/cycles/create.html',
		controller: ['$scope', '$state', '$stateParams', '$rootScope', 'Cycle', function($scope, $state, $stateParams, $rootScope, Cycle){
			$scope.refresh = function(){
				$rootScope.$broadcast('Cycle');
			};

			// the model to edit
			$scope.cycleCreate = new Cycle();

			// save
			$scope.create = function() {
				$scope.cycleCreate.$create().then(function(cycle) {

					// redirect
					$state.go('portal.admin.cycles.show', {
						cycle: cycle.id
					});

				});
			};

		}]
	})

	.state('portal.admin.cycles.show', {
		url: '/show/:cycle',
		templateUrl: 'portal/admin/cycles/show.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Cycle', 'Role', 'Status', 'Trigger', function($scope, $state, $stateParams, $window, Cycle, Role, Status, Trigger){
			$scope.permissions = {
				create: {
					id: 'create',
					title: 'Create'
				},
				read: {
					id: 'read',
					title: 'Read'
				},
				update: {
					id: 'update',
					title: 'Update'
				},
				destroy: {
					id: 'destroy',
					title: 'Destroy'
				}
			};

			var cycleBackup = null;

			$scope.cycleEdit = null;
			$scope.toggleEdit = function(){
				$scope.cycleEdit = $scope.cycleEdit ? null : new Cycle($scope.cycle);
			};

			$scope.cycleInstructionsEdit = false;
			$scope.toggleInstructionsEdit = function(){
				if($scope.cycleInstructionsEdit) $scope.cycle.instructions = angular.copy(cycleBackup.instructions);
				$scope.cycleInstructionsEdit = !$scope.cycleInstructionsEdit;
			};

			$scope.cyclePermissionsEdit = false;
			$scope.togglePermissionsEdit = function(){
				if($scope.cyclePermissionsEdit) $scope.cycle.permissions = angular.copy(cycleBackup.permissions);
				$scope.cyclePermissionsEdit = !$scope.cyclePermissionsEdit;
			};

			$scope.source = {cycle: null};
			$scope.toggleSource = function(){
				if($scope.source.cycle)
				return ($scope.source.cycle = null);

				$scope.source.cycle = angular.copy($scope.cycle);

				// remove calculated properties
				delete $scope.source.cycle.role;
				delete $scope.source.cycle.open;
			};

			// Get Resources
			// -------------

			function getCycle(){
				if(!$stateParams.cycle)
					return;

				// get the cycle
				Cycle.get({id: $stateParams.cycle}).$promise.then(function(cycle){
					$scope.cycle = cycle;
					cycleBackup = angular.copy(cycle);
				});

				// get cycle roles
				Role.query({cycle: $stateParams.cycle}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});

				// get cycle statuses
				Status.query({cycle: $stateParams.cycle}).$promise.then(function(statuses){
					$scope.statuses = statuses;
					$scope.statusesById = _.indexBy(statuses, 'id');
				});

				// get cycle triggers
				Trigger.query({cycle: $stateParams.cycle}).$promise.then(function(triggers){
					$scope.triggers = triggers;
					$scope.triggersById = _.indexBy(triggers, 'id');
				});

				// TODO: get cycle stages
			}
			getCycle();
			$scope.$on('Cycle', getCycle);



			// Actions
			// -------

			$scope.update = function(){
				$scope.cycleEdit.$update({id: $scope.cycle.id}).then(function(){
					$scope.cycleEdit = null;
				});
			};

			$scope.updateInstructions = function(){
				new Cycle({instructions: $scope.cycle.instructions}).$update({id: $scope.cycle.id}).then(function(){
					$scope.cycleInstructionsEdit = false;
				});
			};

			$scope.updatePermissions = function(){
				new Cycle({permissions: $scope.cycle.permissions}).$update({id: $scope.cycle.id}).then(function(){
					$scope.cyclePermissionsEdit = false;
				});
			};

			$scope.updateSource = function(){
				new Cycle($scope.source.cycle).$update({id: $scope.cycle.id}).then(function(){
					$scope.source.cycle = null;
				});
			};

			$scope.destroy = function(){
				if(!$window.confirm('Are you sure you want to delete this cycle?'))
					return;

				$scope.cycle.$delete({id: $scope.cycle.id}).then(function(){
					// redirect
					$state.go('portal.admin.cycles.list');
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.roles', {
		url: '/roles',
		templateUrl: 'portal/admin/cycles/show.roles.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Role', function($scope, $state, $stateParams, $window, Role) {
			$scope.roles = [];
			
			$scope.roleCreate = null;
			$scope.toggleCreate = function() {
				$scope.roleCreate = $scope.roleCreate ? null : new Role();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(role) {
				if(!$scope.backup[role.id])
					return ($scope.backup[role.id] = angular.copy(role));

				// revert to backup
				angular.extend(role, $scope.backup[role.id]);
				delete $scope.backup[role.id];
			};



			// Get Resources
			// -------------

			function getRoles(){
				$scope.roles = Role.query({cycle: $stateParams.cycle});
				$scope.backup = {};
			}
			getRoles();
			$scope.$on('Cycle', getRoles);



			// Actions
			// -------

			$scope.save = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$save({cycle: $scope.cycle.id, id: role.id});
			};

			$scope.update = function(role) {
				if(!role) return $window.alert('No role specified.');
				role.$update({cycle: $scope.cycle.id, id: role.id});
			};

			$scope.delete = function(role) {
				if(!role) return $window.alert('No role specified.');
				if(!$window.confirm('Are you sure you want to delete this role?')) return;
				role.$delete({cycle: $scope.cycle.id, id: role.id});
			};

			$scope.create = function() {
				if(!$scope.roleCreate.id || !$scope.roleCreate.id.length)
					return $window.alert('An ID must be set.');

				// Set empty assignable and visible
				$scope.roleCreate.assignable = {};
				$scope.roleCreate.visible = {};

				$scope.roleCreate.$save({cycle: $scope.cycle.id, id: $scope.roleCreate.id}).then(function(){
					// clear the form
					$scope.roleCreate = null;
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.statuses', {
		url: '/statuses',
		templateUrl: 'portal/admin/cycles/show.statuses.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Status', function($scope, $state, $stateParams, $window, Status) {
			$scope.statuses = [];

			$scope.statusCreate = null;
			$scope.toggleCreate = function() {
				$scope.statusCreate = $scope.statusCreate ? null : new Status();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(status) {
				if(!$scope.backup[status.id])
					return ($scope.backup[status.id] = angular.copy(status));

				// revert to backup
				angular.extend(status, $scope.backup[status.id]);
				delete $scope.backup[status.id];
			};


			// Get Resources
			// -------------

			function getStatuses(){
				$scope.statuses = Status.query({cycle: $stateParams.cycle});
				$scope.backup = {};
			}
			getStatuses();
			$scope.$on('Cycle', getStatuses);


			// Actions
			// -------

			$scope.save = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$save({cycle: $scope.cycle.id, id: status.id});
			};

			$scope.update = function(status) {
				if(!status) return $window.alert('No status specified.');
				status.$update({cycle: $scope.cycle.id, id: status.id});
			};

			$scope.delete = function(status) {
				if(!status) return $window.alert('No status specified.');
				if(!$window.confirm('Are you sure you want to delete this status?')) return;
				status.$delete({cycle: $scope.cycle.id, id: status.id});
			};

			$scope.create = function() {
				if(!$scope.statusCreate.id || !$scope.statusCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.statusCreate.$save({cycle: $scope.cycle.id, id: $scope.statusCreate.id}).then(function(){
					// clear the form
					$scope.statusCreate = null;
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.triggers', {
		url: '/triggers',
		templateUrl: 'portal/admin/cycles/show.triggers.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'Trigger', 'Status', 'Stage', function($scope, $state, $stateParams, $window, Trigger, Status, Stage) {
			$scope.triggers = [];

			$scope.triggerCreate = null;
			$scope.toggleCreate = function() {
				$scope.triggerCreate = $scope.triggerCreate ? null : new Trigger();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(trigger) {
				if(!$scope.backup[trigger.id])
					return ($scope.backup[trigger.id] = angular.copy(trigger));

				// revert to backup
				angular.extend(trigger, $scope.backup[trigger.id]);
				delete $scope.backup[trigger.id];
			};


			// Get Resources
			// -------------

			function getTriggers(){
				Trigger.query({cycle: $stateParams.cycle}).$promise.then(function(triggers){
					$scope.triggers = triggers;
					$scope.triggersById = _.indexBy(triggers, 'id');
				});
				$scope.backup = {};
			}
			getTriggers();
			$scope.$on('Cycle', getTriggers);


			function getStatuses(){
				Status.query({cycle: $stateParams.cycle}).$promise.then(function(statuses){
					$scope.statuses = statuses;
					$scope.statusesById = _.indexBy(statuses, 'id');
				});
			}
			getStatuses();
			$scope.$on('Cycle', getStatuses);


			function getStages(){
				Stage.query({cycle: $stateParams.cycle}).$promise.then(function(stages){
					$scope.stages = stages;
					$scope.stagesById = _.indexBy(stages, 'id');
				});
			}
			getStages();
			$scope.$on('Cycle', getStages);


			// Actions
			// -------

			$scope.save = function(trigger) {
				if(!trigger) return $window.alert('No trigger specified.');
				trigger.$save({cycle: $scope.cycle.id, id: trigger.id});
			};

			$scope.update = function(trigger) {
				if(!trigger) return $window.alert('No trigger specified.');
				trigger.$update({cycle: $scope.cycle.id, id: trigger.id});
			};

			$scope.delete = function(trigger) {
				if(!trigger) return $window.alert('No trigger specified.');
				if(!$window.confirm('Are you sure you want to delete this trigger?')) return;
				trigger.$delete({cycle: $scope.cycle.id, id: trigger.id});
			};

			$scope.create = function() {
				if(!$scope.triggerCreate.id || !$scope.triggerCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.triggerCreate.$save({cycle: $scope.cycle.id, id: $scope.triggerCreate.id}).then(function(){
					// clear the form
					$scope.triggerCreate = null;
				});
			};

			$scope.removeIndex = function(collection, index) {
				collection.splice(index, 1);
			}

			$scope.addCondition = function(collection) {
				collection.push({name: 'status', invert: false, options: {}});
			}

			$scope.addGroup = function(collection) {
				collection.push([]);
				$scope.addCondition(collection[collection.length - 1]);
			}
		}]
	})

	.state('portal.admin.cycles.show.exports', {
		url: '/exports',
		templateUrl: 'portal/admin/cycles/show.exports.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'ObjectPath', 'Export', function($scope, $state, $stateParams, $window, ObjectPath, Export) {
			$scope.exports = [];

			$scope.exportCreate = null;
			$scope.toggleCreate = function() {
				$scope.exportCreate = $scope.exportCreate ? null : new Export();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(exp) {
				if(!$scope.backup[exp.id])
					return ($scope.backup[exp.id] = angular.copy(exp));

				// revert to backup
				angular.extend(exp, $scope.backup[exp.id]);
				delete $scope.backup[exp.id];
			};


			// Get Resources
			// -------------

			function getExports(){
				$scope.exports = Export.query({cycle: $stateParams.cycle});
				$scope.backup = {};
			}
			getExports();
			$scope.$on('Cycle', getExports);


			// Actions
			// -------

			$scope.save = function(exp) {
				if(!exp) return $window.alert('No export specified.');
				exp.$save({cycle: $scope.cycle.id, id: exp.id});
			};

			$scope.update = function(exp) {
				if(!exp) return $window.alert('No export specified.');
				exp.$update({cycle: $scope.cycle.id, id: exp.id});
			};

			$scope.delete = function(exp) {
				if(!exp) return $window.alert('No export specified.');
				if(!$window.confirm('Are you sure you want to delete this export?')) return;
				exp.$delete({cycle: $scope.cycle.id, id: exp.id});
			};

			$scope.create = function() {
				if(!$scope.exportCreate.id || !$scope.exportCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.exportCreate.$save({cycle: $scope.cycle.id, id: $scope.exportCreate.id}).then(function(){
					// clear the form
					$scope.exportCreate = null;
				});
			};
		}]
	})

	.state('portal.admin.cycles.show.assignments', {
		url: '/assignments',
		templateUrl: 'portal/admin/cycles/show.assignments.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'CycleAssignment', 'User', 'Role', function($scope, $state, $stateParams, $window, CycleAssignment, User, Role) {
			$scope.assignments = [];

			$scope.assignmentCreate = null;
			$scope.toggleCreate = function() {
				$scope.assignmentCreate = $scope.assignmentCreate ? null : new CycleAssignment();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(assignment) {
				if(!$scope.backup[assignment.id])
					return ($scope.backup[assignment.id] = angular.copy(assignment));

				// revert to backup
				angular.extend(assignment, $scope.backup[assignment.id]);
				delete $scope.backup[assignment.id];
			};

			// new user assignment
			$scope.userSelect = {
				data: [],
				// filter out users who are already part of the project
				filter: function(u){
					return Object.keys($scope.assignmentsById).indexOf(u.id) === -1;
				},
				// search for possible users
				search: function(search){
					User.query({search: search, sort: [{path: ['name']}], per_page: 20}).$promise.then(function(users){
						$scope.userSelect.data = users;
					});
				}
			};

			// Get Resources
			// -------------

			function getCycleAssignments(){
				CycleAssignment.query({cycle: $stateParams.cycle}).$promise.then(function(assignments){
					$scope.assignments = assignments;
					$scope.assignmentsById = _.indexBy(assignments, 'id');
					$scope.backup = {};
				});
			}
			getCycleAssignments();
			$scope.$on('Cycle', getCycleAssignments);


			function getRoles(){
				Role.query({cycle: $stateParams.cycle}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});
			}
			getRoles();
			$scope.$on('Cycle', getRoles);


			function getUsers(){
				// TODO: we need to re-implement /cycles/:cycle/users in the API!!!!
				User.query({cycle: $stateParams.cycle}).$promise.then(function(users){
					$scope.users = users;
					$scope.usersById = _.indexBy(users, 'id');
				});

			}
			getUsers();
			$scope.$on('User', getUsers);
			$scope.$on('Cycle', getUsers);



			// Actions
			// -------

			$scope.save = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$save({cycle: $scope.cycle.id, id: assignment.id});
			};

			$scope.update = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				assignment.$update({cycle: $scope.cycle.id, id: assignment.id});
			};

			$scope.delete = function(assignment) {
				if(!assignment) return $window.alert('No assignment specified.');
				if(!$window.confirm('Are you sure you want to delete this assignment?')) return;
				assignment.$delete({cycle: $scope.cycle.id, id: assignment.id});
			};

			$scope.create = function() {
				if(!$scope.assignmentCreate.id || !$scope.assignmentCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.assignmentCreate.$save({cycle: $scope.cycle.id, id: $scope.assignmentCreate.id}).then(function(){

					// clear the form
					$scope.assignmentCreate = null;

				});
			};
		}]
	})

	.state('portal.admin.cycles.show.stages', {
		url: '/stages',
		templateUrl: 'portal/admin/cycles/show.stages.html',
		controller: ['$scope', '$state', '$stateParams', '$window', 'GandhiComponent', 'Stage', function($scope, $state, $stateParams, $window, GandhiComponent, Stage) {
			$scope.stages = [];

			$scope.stageCreate = null;
			$scope.toggleCreate = function(stage) {
				$scope.stageCreate = $scope.stageCreate ? null : new Stage();
			};

			$scope.backup = {};
			$scope.toggleEdit = function(stage) {
				if(!$scope.backup[stage.id])
					return ($scope.backup[stage.id] = angular.copy(stage));

				// revert to backup
				angular.extend(stage, $scope.backup[stage.id]);
				delete $scope.backup[stage.id];
			};

			// Get Resources
			// -------------

			function getStages(){
				Stage.query({cycle: $stateParams.cycle}).$promise.then(function(stages){
					$scope.stages = stages;
				});
				$scope.backup = {};
			}
			getStages();
			$scope.$on('Cycle', getStages);


			// Actions
			// -------

			$scope.save = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$save({cycle: $scope.cycle.id, id: stage.id});
			};

			$scope.update = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				stage.$update({cycle: $scope.cycle.id, id: stage.id});
			};

			$scope.delete = function(stage) {
				if(!stage) return $window.alert('No stage specified.');
				if(!$window.confirm('Are you sure you want to delete this stage?')) return;
				stage.$delete({cycle: $scope.cycle.id, id: stage.id});
			};

			$scope.create = function() {
				if(!$scope.stageCreate.id || !$scope.stageCreate.id.length)
					return $window.alert('An ID must be set.');

				$scope.stageCreate.$save({cycle: $scope.cycle.id, id: $scope.stageCreate.id}).then(function(stage){
					// clear the form
					$scope.stageCreate = null;
				});
			};


			$scope.components = GandhiComponent;

			$scope.sortableOptions = {
				handle: '> td.handle',
				stop: function() {
					// Update each stage that changed
					$scope.stages.forEach(function(stage, i){
						if(stage.order != i) new Stage({order: i}).$update({cycle: $scope.cycle.id, id: stage.id});
					});
				}
			};
		}]
	})

	.state('portal.admin.cycles.show.stages.stage', {
		url: '/:stage',
		templateUrl: 'portal/admin/cycles/show.stages.stage.html',
		controller: ['$scope', '$state', '$stateParams', 'GandhiComponent', 'Stage', 'Role', function($scope, $state, $stateParams, GandhiComponent, Stage, Role) {
			$scope.stage = null;
			$scope.component = null;
			var backup = null;

			$scope.editVisibility = false;
			$scope.toggleVisibility = function() {
				if($scope.editVisibility) $scope.stage.visible = angular.copy(backup.visible);
				$scope.editVisibility = !$scope.editVisibility;
			};

			$scope.editComponentPermissions = false;
			$scope.toggleComponentPermissions = function() {
				if($scope.editComponentPermissions) $scope.stage.component.permissions = angular.copy(backup.component.permissions);
				$scope.editComponentPermissions = !$scope.editComponentPermissions;
			};


			// Get Resources
			// -------------

			function getStage(){
				Stage.get({cycle: $stateParams.cycle, id: $stateParams.stage}).$promise.then(function(stage){
					backup = angular.copy(stage);
					$scope.stage = stage;
					$scope.component = GandhiComponent[stage.component.name];
				});
			}
			getStage();
			$scope.$on('Cycle', getStage);


			function getRoles(){
				Role.query({cycle: $stateParams.cycle}).$promise.then(function(roles){
					$scope.roles = roles;
					$scope.rolesById = _.indexBy(roles, 'id');
				});
			}
			getRoles();
			$scope.$on('Cycle', getRoles);


			// Actions
			// -------

			$scope.updateVisibility = function() {
				new Stage({visible: $scope.stage.visible}).$update({id: $scope.stage.id, cycle: $scope.cycle.id}).then(function(){
					$scope.editVisibility = false;
				})
			}

			$scope.updateComponentPermissions = function() {
				new Stage({component: {permissions: $scope.stage.component.permissions}}).$update({id: $scope.stage.id, cycle: $scope.cycle.id}).then(function(){
					$scope.editComponentPermissions = false;
				})
			}
		}]
	});

});
