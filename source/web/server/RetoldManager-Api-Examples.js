/**
 * Retold Manager -- Examples Supervisor REST Routes
 *
 * Sibling to Docserve + Content Editor.  Starts / stops / inspects a
 * local `quack examples` server pointed at a module's
 * `example_applications/` folder.  Fixed port 43212 so the chip URL is
 * stable.  Single-instance: starting against a different module kills
 * the previous server.
 *
 * Routes:
 *   POST /api/manager/modules/:name/examples/start
 *   POST /api/manager/examples/stop
 *   GET  /api/manager/examples/status
 *
 * Response shape mirrors the supervisor's state:
 *   { Running, Phase, ModuleName, ModulePath, ExamplesPath, Port, URL,
 *     Pid, StartedAt, LastError }
 */

function respondError(pRes, pStatus, pCode, pMessage)
{
	pRes.statusCode = pStatus;
	pRes.send({ Error: pCode, Message: pMessage });
}

module.exports = function registerExamplesRoutes(pCore)
{
	let tmpOrator     = pCore.Orator;
	let tmpCatalog    = pCore.ModuleCatalog;
	let tmpSupervisor = pCore.ExamplesSupervisor;

	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/examples/start',
		function (pReq, pRes, pNext)
		{
			let tmpName  = pReq.params.name;
			let tmpEntry = tmpCatalog.getModule(tmpName);
			if (!tmpEntry)
			{
				respondError(pRes, 404, 'UnknownModule', 'No module named "' + tmpName + '" in the manifest.');
				return pNext();
			}
			try
			{
				// Defer response until either:
				//   - the port is up (success), or
				//   - the supervisor's deadline passes (responds anyway
				//     so the user gets feedback even if the build is
				//     still chugging), or
				//   - npm install fails (5xx).
				tmpSupervisor.start(tmpEntry.Name, tmpEntry.AbsolutePath, function (pErr, pState)
					{
						if (pErr)
						{
							respondError(pRes, 500, 'ExamplesBuildError', pErr.message || String(pErr));
							return pNext();
						}
						pRes.send(pState);
						return pNext();
					});
				return;
			}
			catch (pError)
			{
				respondError(pRes, 500, 'ExamplesSpawnError', pError && pError.message ? pError.message : String(pError));
			}
			return pNext();
		});

	tmpOrator.serviceServer.doPost('/api/manager/examples/stop',
		function (pReq, pRes, pNext)
		{
			tmpSupervisor.stop();
			pRes.send(tmpSupervisor.getState());
			return pNext();
		});

	tmpOrator.serviceServer.doGet('/api/manager/examples/status',
		function (pReq, pRes, pNext)
		{
			pRes.send(tmpSupervisor.getState());
			return pNext();
		});
};
