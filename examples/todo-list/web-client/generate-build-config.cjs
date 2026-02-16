// Generates .gulpfile-quackage-config.json with absolute paths for the current environment
const libPath = require('path');
const libFS = require('fs');

const tmpConfig =
	{
		EntrypointInputSourceFile: libPath.resolve(__dirname, 'source/TodoList-Application.cjs'),
		LibraryObjectName: 'TodoListApp',
		LibraryOutputFolder: libPath.resolve(__dirname, 'dist') + '/',
		LibraryUniminifiedFileName: 'todo-list-app.compatible.js',
		LibraryMinifiedFileName: 'todo-list-app.compatible.min.js'
	};

libFS.writeFileSync(
	libPath.resolve(__dirname, '.gulpfile-quackage-config.json'),
	JSON.stringify(tmpConfig, null, '\t'));

console.log('Build config generated.');
