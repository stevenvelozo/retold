const libFableServiceProviderBase = require('fable-serviceproviderbase');
const libHttp = require('http');

class TodoAPIService extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.serviceType = 'TodoAPI';
	}

	/**
	 * Make an HTTP request to the Todo API.
	 *
	 * @param {string} pMethod - HTTP method (GET, POST, PUT, DELETE)
	 * @param {string} pPath - URL path (e.g. /1.0/Tasks)
	 * @param {Object|null} pBody - Request body (for POST/PUT)
	 * @param {Function} fCallback - Callback(pError, pParsedResponse)
	 */
	request(pMethod, pPath, pBody, fCallback)
	{
		let tmpBaseURL = this.fable.settings.ApiBaseURL || 'http://localhost:8086';
		let tmpURL = new URL(pPath, tmpBaseURL);

		let tmpOptions =
		{
			method: pMethod,
			hostname: tmpURL.hostname,
			port: tmpURL.port,
			path: tmpURL.pathname + tmpURL.search,
			headers: { 'Content-Type': 'application/json' }
		};

		let tmpReq = libHttp.request(tmpOptions,
			(pResponse) =>
			{
				let tmpData = '';
				pResponse.on('data', (pChunk) => { tmpData += pChunk; });
				pResponse.on('end', () =>
				{
					try
					{
						let tmpParsed = JSON.parse(tmpData);
						return fCallback(null, tmpParsed);
					}
					catch (pParseError)
					{
						return fCallback(pParseError);
					}
				});
			});

		tmpReq.on('error', (pError) => { return fCallback(pError); });

		if (pBody)
		{
			tmpReq.write(JSON.stringify(pBody));
		}
		tmpReq.end();
	}

	/**
	 * Build a FilteredTo path with optional sort and search.
	 *
	 * @param {string} pSortColumn - Column to sort by (default 'DueDate')
	 * @param {string} pSortDirection - ASC or DESC (default 'DESC')
	 * @param {string} pSearchText - Optional LIKE search across Name and Description
	 * @param {number} pLimit - Max records to return (default 50)
	 * @returns {string} The URL path
	 */
	buildFilteredPath(pSortColumn, pSortDirection, pSearchText, pLimit)
	{
		let tmpSortColumn = pSortColumn || 'DueDate';
		let tmpSortDirection = pSortDirection || 'DESC';
		let tmpLimit = pLimit || 50;

		let tmpFilter = 'FSF~' + tmpSortColumn + '~' + tmpSortDirection + '~0';

		if (pSearchText)
		{
			let tmpSearchEncoded = encodeURIComponent('%' + pSearchText + '%');
			tmpFilter = 'FBV~Name~LK~' + tmpSearchEncoded
				+ '~FBVOR~Description~LK~' + tmpSearchEncoded
				+ '~' + tmpFilter;
		}

		return '/1.0/Tasks/FilteredTo/' + tmpFilter + '/0/' + tmpLimit;
	}
}

module.exports = TodoAPIService;
