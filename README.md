# ext-cgi-mongo
MongoDB CGI for ExtJS AJAX proxy

## Questions and Bug Reports
* mailing list: Victor.Vazin@gmail.com

## Installation
Install the ext-cgi-mongo and it's dependencies by executing
the following `NPM` command.
```
npm install ext-cgi-mongo --save
```
## Troubleshooting
The ext-cgi-mongo depends on several other packages. These are.

* mongodb
* node-uuid

Ensure, that your user has write permission to wherever the node modules
are being installed.

QuickStart
==========
Store definition in ExtJS style:
```
var store = Ext.create('Ext.data.TreeStore', {
			
	storeId: 'storeId',
	model: 'My.model.treeModel',			
	proxy: {

		type: 'ajax',
		actionMethods: {

			create: 'POST',
			read: 'GET',
			update: 'PUT',
			destroy: 'DELETE'

		},
		url: 'mongo',
		reader: {
	
			type: 'json',
			typeProperty: 'entity'
		
		},
		writer: { writeAllFields: true }

	}
});
...
store.sync();
```
## Next Steps
 * [server example](https://www.npmjs.com/package/sd-server)
