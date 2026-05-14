/**
 * Retold Manager -- Content Editor Supervisor REST Routes
 *
 * Parallel to the docserve API — lets the web UI spawn / stop /
 * inspect a local retold-content-system editor pointed at any module's
 * docs/ folder.  Single-instance: starting against a different module
 * kills the previous editor.  Distinct port from docuserve (43211 vs
 * 43210) so the two can coexist — view docs in docuserve, edit them
 * in content-system, at the same time.
 *
 * Routes:
 *   POST /api/manager/modules/:name/content-editor/start
 *   POST /api/manager/content-editor/stop
 *   GET  /api/manager/content-editor/status
 *
 * Response shape matches the supervisor's full state:
 *   { Running, ModuleName, ModulePath, ContentPath, Port, URL, Pid, StartedAt }
 */

function respondError(pRes, pStatus, pCode, pMessage)
{
	pRes.statusCode = pStatus;
	pRes.send({ Error: pCode, Message: pMessage });
}

module.exports = function registerContentEditorRoutes(pCore)
{
	let tmpOrator     = pCore.Orator;
	let tmpCatalog    = pCore.ModuleCatalog;
	let tmpSupervisor = pCore.ContentEditorSupervisor;

	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/content-editor/start',
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
				// Defer response until the editor has bound its port (or
				// the supervisor's deadline passes), so the chip's
				// click-to-open doesn't race the spawn.
				tmpSupervisor.start(tmpEntry.Name, tmpEntry.AbsolutePath, function (pErr, pState)
					{
						pRes.send(pState);
						return pNext();
					});
				return;
			}
			catch (pError)
			{
				respondError(pRes, 500, 'ContentEditorSpawnError', pError && pError.message ? pError.message : String(pError));
			}
			return pNext();
		});

	tmpOrator.serviceServer.doPost('/api/manager/content-editor/stop',
		function (pReq, pRes, pNext)
		{
			tmpSupervisor.stop();
			pRes.send(tmpSupervisor.getState());
			return pNext();
		});

	tmpOrator.serviceServer.doGet('/api/manager/content-editor/status',
		function (pReq, pRes, pNext)
		{
			pRes.send(tmpSupervisor.getState());
			return pNext();
		});
};
