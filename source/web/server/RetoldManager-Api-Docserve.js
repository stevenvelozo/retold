/**
 * Retold Manager -- Docserve Supervisor REST Routes
 *
 * Lets the web UI spawn / stop / inspect a local pict-docuserve dev
 * server pointed at any module in the manifest.  The supervisor is
 * single-instance (starting against a different module kills the
 * previous serve), so authors can flip between modules to see branding
 * / examples / doc changes before publishing.
 *
 * Routes:
 *   POST /api/manager/modules/:name/docserve/start  — spawn for one module
 *   POST /api/manager/docserve/stop                 — kill whatever's running
 *   GET  /api/manager/docserve/status               — current state
 *
 * Each response is the supervisor's full state object:
 *   { Running, ModuleName, ModulePath, Port, URL, Pid, StartedAt }
 */

function respondError(pRes, pStatus, pCode, pMessage)
{
	pRes.statusCode = pStatus;
	pRes.send({ Error: pCode, Message: pMessage });
}

module.exports = function registerDocserveRoutes(pCore)
{
	let tmpOrator     = pCore.Orator;
	let tmpCatalog    = pCore.ModuleCatalog;
	let tmpSupervisor = pCore.DocserveSupervisor;

	// ─────────────────────────────────────────────
	//  POST /api/manager/modules/:name/docserve/start
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/modules/:name/docserve/start',
		function (pReq, pRes, pNext)
		{
			let tmpName = pReq.params.name;
			let tmpEntry = tmpCatalog.getModule(tmpName);
			if (!tmpEntry)
			{
				respondError(pRes, 404, 'UnknownModule', 'No module named "' + tmpName + '" in the manifest.');
				return pNext();
			}
			try
			{
				// Defer response until docuserve has bound its port (or
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
				respondError(pRes, 500, 'DocserveSpawnError', pError && pError.message ? pError.message : String(pError));
			}
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  POST /api/manager/docserve/stop
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doPost('/api/manager/docserve/stop',
		function (pReq, pRes, pNext)
		{
			tmpSupervisor.stop();
			pRes.send(tmpSupervisor.getState());
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/docserve/status
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/docserve/status',
		function (pReq, pRes, pNext)
		{
			pRes.send(tmpSupervisor.getState());
			return pNext();
		});
};
