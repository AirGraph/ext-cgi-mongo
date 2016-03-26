//	MongoDB CGI for ExtJS AJAX proxy.
//		Version 0.0.1.
//			Copyright (c) Jungle Software, 2016.

var mongoClient = require('mongodb').MongoClient,
		ObjectId = require('mongodb').ObjectID,
		uuid = require('node-uuid'),

		querystring = require('querystring'),
		assert = require('assert'),
		url = require('url');

(function (namespace) {
	'use strict';

	namespace._defaults = {

		url: 'mongodb://localhost:27017/'

	};

	namespace._enumerables = ['valueOf', 'toLocaleString', 'toString', 'constructor'];

	for (var i in { toString: 1 }) { namespace._enumerables = null; }

	namespace._apply = function(object, config, defaults) {

		if(defaults) { namespace._apply(object, defaults); }
		if (object && config && typeof config === 'object') {

			var i, j, k;
			for (i in config) { object[i] = config[i]; }

			if (namespace._enumerables) {

				for (j = namespace._enumerables.length; j--;) {

					k = namespace._enumerables[j];
					if (config.hasOwnProperty(k)) { object[k] = config[k]; }

				}
			}
		}

		return object;
	};

	var Cgi = function(config) {

		var i, j, maxI, maxJ, dbName;

		if (!(this instanceof namespace.Cgi)) {
			return new namespace.Cgi(config);
		}

		this.config = namespace._apply({}, config, namespace._defaults);
		this.cash = {};
		mongoClient.connect(this.config.url + 'test', function(err, db) {

			assert.equal(null, err);
			db.admin().listDatabases( function(err, dbs) {

				assert.equal(null, err);
				db.close();

				for(i = 0, maxI = dbs.databases.length; i < maxI; i += 1) {

					mongoClient.connect(this.config.url + dbs.databases[i].name, function(err, db) {

						assert.equal(null, err);
						db.listCollections().toArray( function(err, colls) {

							assert.equal(null, err);
							dbName = db.databaseName;
							db.close();

							this.cash[dbName] = [];
							for(j = 0, maxJ = colls.length; j < maxJ; j += 1) {

								if (colls[j].name.search('system') === -1) {

									this.cash[dbName].push(colls[j].name);

								}
							}

						}.bind(this));
					}.bind(this));
				}

			}.bind(this));
		}.bind(this));
	};

	Cgi.prototype = {

		_getDbName: function(collName) {

			var i, j, maxJ, hasOwn = Object.prototype.hasOwnProperty;

			for(i in this.cash) {

				if (hasOwn.call(this.cash, i)) {

					for(j = 0, maxJ = this.cash[i].length; j < maxJ; j += 1) {

						if (this.cash[i][j] === collName) { return i; }

					}
				}
			}

			return null;
		},

		_removeCollName: function(dbName, collName) {

			var i, max;

			for(i = 0, max = this.cash[dbName].length; i < max; i += 1) {

				if (this.cash[dbName][i] === collName) {

					this.cash[dbName].splice(i, 1);
					break;

				}
			}
		},

		_dropDatabase: function(res, dbName) {

			mongoClient.connect(this.config.url + dbName, function(err, db) {

				assert.equal(null, err);
				db.dropDatabase(function(err, result) {

					assert.equal(null, err);
					db.close();
					delete(this.cash[dbName]);

					res.writeHead(200, {'Content-Type': 'text/plain'});
					res.end();

				}.bind(this));
			}.bind(this));

		},

		_dropCollection: function(res, dbName, collName) {

			mongoClient.connect(this.config.url + dbName, function(err, db) {

				assert.equal(null, err);
				db.dropCollection(collName, function(err, result) {

					assert.equal(null, err);
					db.close();
					this._removeCollName(dbName, collName);

					res.writeHead(200, {'Content-Type': 'text/plain'});
					res.end();

				}.bind(this));
			}.bind(this));

		},

		_dropDocument: function(res, dbName, collName, docId) {

			mongoClient.connect(this.config.url + dbName, function(err, db) {

				assert.equal(null, err);
				db.collection(collName).deleteOne({_id: ObjectId(docId)}, function(err, result) {

					assert.equal(null, err);
					db.close();

					res.writeHead(200, {'Content-Type': 'text/plain'});
					res.end();

				});
			});

		},

		_resErr: function(res, err, errMsg) {

			res.writeHead(err, {'Content-Type': 'text/plain'});
			res.end(errMsg);

		},

		POST: function (req, res, inputData) {

			var doc = JSON.parse(inputData),
					qstring = url.parse(req.url).query,
					dbName = querystring.parse(qstring)['dbName'],
					collName = querystring.parse(qstring)['collName'];

			if(dbName in this.cash) {

				if(this.cash[dbName].indexOf(collName) !== -1) {

					mongoClient.connect(this.config.url + dbName, function(err, db) {

						assert.equal(null, err);
						db.collection(collName).insertOne(doc, function(err, resObj) {

							assert.equal(null, err);
							db.close();

							res.writeHead(200, {'Content-Type': 'text/plain'});
							res.end();

						});
					});

				} else {

					mongoClient.connect(this.config.url + dbName, function(err, db) {

						assert.equal(null, err);
						db.createCollection(collName, function(err, collection) {

							assert.equal(null, err);
							collection.insertOne(doc, function(err, resObj) {

								assert.equal(null, err);
								db.close();

								this.cash[dbName].push(collName);
								res.writeHead(200, {'Content-Type': 'text/plain'});
								res.end();

							}.bind(this));
						}.bind(this));
					}.bind(this));

				}

			} else {

				mongoClient.connect(this.config.url + dbName, function(err, db) {

					assert.equal(null, err);
					db.createCollection(collName, function(err, collection) {

						assert.equal(null, err);
						collection.insertOne(doc, function(err, resObj) {

							assert.equal(null, err);
							db.close();

							this.cash[dbName] = [];
							this.cash[dbName].push(collName);
							res.writeHead(200, {'Content-Type': 'text/plain'});
							res.end();

						}.bind(this));
					}.bind(this));
				}.bind(this));

			}
		},

		GET: function (req, res) {

			var i, max, dbName, collName, curs, children = [],
					qstring = url.parse(req.url).query,
					nodeId = querystring.parse(qstring)['node'];

			if (nodeId === 'root') {

				mongoClient.connect(this.config.url + 'test', function(err, db) {

					assert.equal(null, err);
					db.admin().listDatabases( function(err, dbs) {

						assert.equal(null, err);
						db.close();

						for(i = 0, max = dbs.databases.length; i < max; i += 1) {

							children.push(namespace._apply({}, {

								parentId: 'root',
								_id: '__' + dbs.databases[i].name,
								entity: 'database',
								leaf: false

							}, dbs.databases[i]));

						}

						children.push({

							parentId: 'root',
							_id: uuid.v1(),
							entity: 'number',
							name: 'totalSize',
							value: dbs.totalSize,
							leaf: true

						});

						res.writeHead(200, {'Content-Type': 'text/plain'});
						res.end(JSON.stringify(children));

					});
				});

			} else if ((nodeId.charAt(0) === '_')&&(nodeId.charAt(1) === '_')) {

				dbName = nodeId.substring(2);
				mongoClient.connect(this.config.url + dbName, function(err, db) {

					assert.equal(null, err);
					db.listCollections().toArray( function(err, colls) {

						assert.equal(null, err);
						db.close();

						for(i = 0, max = colls.length; i < max; i += 1) {

							if (colls[i].name.search('system') === -1) {

								children.push(namespace._apply({}, {

									parentId: nodeId,
									_id: '_' + colls[i].name,
									entity: 'collection',
									leaf: false

								}, colls[i]));

							}
						}

						res.writeHead(200, {'Content-Type': 'text/plain'});
						res.end(JSON.stringify(children));

					});
				});

			} else if (nodeId.charAt(0) === '_') {

				collName = nodeId.substring(1);
				dbName = this._getDbName(collName);
				assert.notEqual(null, dbName);

				mongoClient.connect(this.config.url + dbName, function(err, db) {

					assert.equal(null, err);
					db.collection(collName).find().toArray( function(err, docs) {

						assert.equal(null, err);
						db.close();

						for(i = 0, max = docs.length; i < max; i += 1) {

							if('name' in docs[i]) {

								if('entity' in docs[i]) {

									children.push(namespace._apply({}, {

										parentId: nodeId,
										leaf: true

									}, docs[i]));

								} else {

									children.push(namespace._apply({}, {

										parentId: nodeId,
										entity: 'document',
										leaf: true

									}, docs[i]));

								}

							} else {

								if('entity' in docs[i]) {

									children.push(namespace._apply({}, {

										parentId: nodeId,
										name: docs[i]._id,
										leaf: true

									}, docs[i]));

								} else {

									children.push(namespace._apply({}, {

										parentId: nodeId,
										entity: 'document',
										name: docs[i]._id,
										leaf: true

									}, docs[i]));

								}
							}
						}

						res.writeHead(200, {'Content-Type': 'text/plain'});
						res.end(JSON.stringify(children));

					});
				});

			} else { this._resErr(res, 404, 'GET error. NodeId not found...'); }
		},

		PUT: function (req, res, inputData) {

			var clientId, collName, dbName, data = JSON.parse(inputData), resData = [],
					toStr = Object.prototype.toString, arrStr = "[object Array]";

			if(toStr.call(data) === arrStr) {

				if ((data[0]._id.charAt(0) === '_')&&(data[0]._id.charAt(1) === '_')) {

					dbName = data[0]._id.substring(2);
					collName = data[1]._id.substring(1);

					mongoClient.connect(this.config.url + dbName, function(err, db) {

						assert.equal(null, err);
						db.createCollection(collName, function(err, collection) {

							assert.equal(null, err);
							clientId = data[2]._id;
							delete(data[2]._id);
							collection.insertOne(data[2], function(err, result) {

								assert.equal(null, err);
								db.close();

								this.cash[dbName] = [];
								this.cash[dbName].push(collName);

								resData.push({_id: data[0]._id, clientId: data[0]._id});
								resData.push({_id: data[1]._id, clientId: data[1]._id});
								resData.push({_id: result.insertedId, clientId: clientId});

								res.writeHead(200, {'Content-Type': 'text/plain'});
								res.end(JSON.stringify(resData));

							}.bind(this));
						}.bind(this));
					}.bind(this));

				} else if (data[0]._id.charAt(0) === '_') {

					collName = data[0]._id.substring(1);
					dbName = data[0].parentId.substring(2);

					mongoClient.connect(this.config.url + dbName, function(err, db) {

						assert.equal(null, err);
						db.createCollection(collName, function(err, collection) {

							assert.equal(null, err);
							clientId = data[1]._id;
							delete(data[1]._id);
							collection.insertOne(data[1], function(err, result) {

								assert.equal(null, err);
								db.close();

								this.cash[dbName].push(collName);

								resData.push({_id: data[0]._id, clientId: data[0]._id});
								resData.push({_id: result.insertedId, clientId: clientId});

								res.writeHead(200, {'Content-Type': 'text/plain'});
								res.end(JSON.stringify(resData));

							}.bind(this));
						}.bind(this));
					}.bind(this));

				} else { this._resErr(res, 400, 'PUT error. Bad inputData...'); }

			} else {

				collName = data.parentId.substring(1);
				dbName = this._getDbName(collName);

				clientId = data._id;
				delete(data._id);

				mongoClient.connect(this.config.url + dbName, function(err, db) {

					assert.equal(null, err);
					if(clientId.length > 24) {

						db.collection(collName).insertOne(data, function(err, result) {

							assert.equal(null, err);
							db.close();

							res.writeHead(200, {'Content-Type': 'text/plain'});
							res.end(JSON.stringify([{

								_id: result.insertedId,
								clientId: clientId

							}]));
						});

					} else {

						db.collection(collName).updateOne({_id: ObjectId(clientId)},
							{$set:data}, function(err, result) {

							assert.equal(null, err);
							db.close();

							res.writeHead(200, {'Content-Type': 'text/plain'});
							res.end();

						});
					}
				});
			}

		},

		DELETE: function (req, res, inputData) {

			var nodeId, dbName, collName,
					data = JSON.parse(inputData),
					qstring = url.parse(req.url).query;

			if(data.length === 3) {

				nodeId = data[0]._id;

				dbName = nodeId.substring(2);
				this._dropDatabase(res, dbName);

			} else if (data.length === 2) {

				nodeId = data[0]._id;

				collName = nodeId.substring(1);
				dbName = this._getDbName(collName);
				assert.notEqual(null, dbName);
				this._dropCollection(res, dbName, collName);

			} else {

				nodeId = data._id;

				if ((nodeId.charAt(0) === '_')&&(nodeId.charAt(1) === '_')) {

					dbName = nodeId.substring(2);
					this._dropDatabase(res, dbName);

				} else if (nodeId.charAt(0) === '_') {

					collName = nodeId.substring(1);
					dbName = this._getDbName(collName);
					assert.notEqual(null, dbName);
					this._dropCollection(res, dbName, collName);

				} else {

					dbName = querystring.parse(qstring)['dbName'];
					collName = querystring.parse(qstring)['collName'];
					this._dropDocument(res, dbName, collName, nodeId);

				}

			}
		}
	};

	namespace.Cgi = Cgi;

}(this));
