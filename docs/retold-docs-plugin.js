/**
 * Retold Docsify Plugin
 *
 * Loads the Indoctrinate-generated catalog and keyword index to provide:
 * 1. Cross-repo content fetching via route aliases (raw.githubusercontent.com)
 * 2. Dynamic sidebar generation from the catalog
 * 3. Cross-module keyword search via lunr
 *
 * @author Steven Velozo <steven@velozo.com>
 */
(function ()
{
	'use strict';

	var _Catalog = null;
	var _KeywordIndex = null;
	var _LunrIndex = null;
	var _Documents = null;

	/**
	 * Build Docsify route aliases from the catalog.
	 * Maps /group/module/path → raw GitHub URL for that module's docs.
	 */
	function buildAliases(pCatalog)
	{
		var tmpAliases = {};
		var tmpOrg = pCatalog.GitHubOrg || 'stevenvelozo';

		for (var i = 0; i < pCatalog.Groups.length; i++)
		{
			var tmpGroup = pCatalog.Groups[i];

			for (var j = 0; j < tmpGroup.Modules.length; j++)
			{
				var tmpModule = tmpGroup.Modules[j];

				if (!tmpModule.HasDocs)
				{
					continue;
				}

				var tmpBranch = tmpModule.Branch || pCatalog.DefaultBranch || 'master';
				var tmpBaseURL = 'https://raw.githubusercontent.com/' + tmpOrg + '/' + tmpModule.Repo + '/' + tmpBranch + '/docs/';
				var tmpRoutePrefix = '/' + tmpGroup.Key + '/' + tmpModule.Name;

				// Match any path under this module
				tmpAliases[tmpRoutePrefix + '/(.*)'] = tmpBaseURL + '$1';

				// Default page for module root
				tmpAliases[tmpRoutePrefix + '/'] = tmpBaseURL + 'README.md';
			}
		}

		return tmpAliases;
	}

	/**
	 * Build sidebar markdown from the catalog.
	 * Returns a markdown string for the Docsify sidebar.
	 */
	function buildSidebarMarkdown(pCatalog)
	{
		var tmpLines = [];
		tmpLines.push('- [Home](/)');
		tmpLines.push('');

		for (var i = 0; i < pCatalog.Groups.length; i++)
		{
			var tmpGroup = pCatalog.Groups[i];
			tmpLines.push('- ' + tmpGroup.Name);
			tmpLines.push('');

			for (var j = 0; j < tmpGroup.Modules.length; j++)
			{
				var tmpModule = tmpGroup.Modules[j];
				var tmpPath = '/' + tmpGroup.Key + '/' + tmpModule.Name + '/';

				if (tmpModule.HasDocs)
				{
					tmpLines.push('  - [' + tmpModule.Name + '](' + tmpPath + ')');
				}
				else
				{
					tmpLines.push('  - ' + tmpModule.Name);
				}
			}

			tmpLines.push('');
		}

		return tmpLines.join('\n');
	}

	/**
	 * Create a module-specific sidebar when viewing a module's docs.
	 * Shows the module's own sidebar content (from the catalog) with a
	 * "Back to Home" link at the top.
	 */
	function buildModuleSidebar(pCatalog, pGroup, pModuleName)
	{
		var tmpLines = [];
		tmpLines.push('- [Home](/)');
		tmpLines.push('- [Back to ' + pGroup.Name + '](#)');
		tmpLines.push('');

		var tmpModule = null;

		for (var j = 0; j < pGroup.Modules.length; j++)
		{
			if (pGroup.Modules[j].Name === pModuleName)
			{
				tmpModule = pGroup.Modules[j];
				break;
			}
		}

		if (!tmpModule || !tmpModule.Sidebar || tmpModule.Sidebar.length < 1)
		{
			return null;
		}

		var tmpRoutePrefix = '/' + pGroup.Key + '/' + tmpModule.Name + '/';

		for (var k = 0; k < tmpModule.Sidebar.length; k++)
		{
			var tmpEntry = tmpModule.Sidebar[k];

			if (tmpEntry.Children)
			{
				tmpLines.push('- ' + tmpEntry.Title);
				tmpLines.push('');

				for (var m = 0; m < tmpEntry.Children.length; m++)
				{
					var tmpChild = tmpEntry.Children[m];
					if (tmpChild.Path)
					{
						tmpLines.push('  - [' + tmpChild.Title + '](' + tmpRoutePrefix + tmpChild.Path + ')');
					}
					else if (tmpChild.Children)
					{
						tmpLines.push('  - ' + tmpChild.Title);
					}
				}

				tmpLines.push('');
			}
			else if (tmpEntry.Path)
			{
				tmpLines.push('- [' + tmpEntry.Title + '](' + tmpRoutePrefix + tmpEntry.Path + ')');
			}
		}

		return tmpLines.join('\n');
	}

	/**
	 * Detect which group/module we're viewing from the current route.
	 */
	function parseRoute(pRoute)
	{
		if (!pRoute || pRoute === '/')
		{
			return null;
		}

		var tmpParts = pRoute.replace(/^\//, '').split('/');

		if (tmpParts.length >= 2)
		{
			return {
				Group: tmpParts[0],
				Module: tmpParts[1],
				Path: tmpParts.slice(2).join('/')
			};
		}

		return null;
	}

	/**
	 * Search the keyword index and return formatted results.
	 */
	function searchKeywords(pQuery)
	{
		if (!_LunrIndex || !_Documents)
		{
			return [];
		}

		try
		{
			var tmpResults = _LunrIndex.search(pQuery);
			var tmpFormatted = [];

			for (var i = 0; i < Math.min(tmpResults.length, 20); i++)
			{
				var tmpRef = tmpResults[i].ref;
				var tmpDoc = _Documents[tmpRef];

				if (tmpDoc)
				{
					tmpFormatted.push({
						Title: tmpDoc.Title,
						Module: tmpDoc.Module,
						Group: tmpDoc.Group,
						Path: '/' + tmpDoc.Group + '/' + tmpDoc.Module + '/' + tmpDoc.DocPath,
						Score: tmpResults[i].score
					});
				}
			}

			return tmpFormatted;
		}
		catch (pError)
		{
			console.warn('Retold search error:', pError);
			return [];
		}
	}

	/**
	 * Render search results as HTML.
	 */
	function renderSearchResults(pResults)
	{
		if (pResults.length < 1)
		{
			return '<div class="retold-search-results"><p class="retold-no-results">No results found</p></div>';
		}

		var tmpHTML = '<div class="retold-search-results">';

		for (var i = 0; i < pResults.length; i++)
		{
			var tmpResult = pResults[i];
			tmpHTML += '<div class="retold-search-result">';
			tmpHTML += '<a href="#' + tmpResult.Path + '">' + tmpResult.Title + '</a>';
			tmpHTML += '<span class="retold-search-module">' + tmpResult.Group + ' / ' + tmpResult.Module + '</span>';
			tmpHTML += '</div>';
		}

		tmpHTML += '</div>';
		return tmpHTML;
	}

	/**
	 * Main Docsify plugin function.
	 */
	function RetoldDocsPlugin(pHook, pVM)
	{
		// Load catalog and keyword index on init
		pHook.init(function ()
		{
			// Fetch the catalog
			fetch('retold-catalog.json')
				.then(function (pResponse)
				{
					if (!pResponse.ok)
					{
						console.warn('Retold: Could not load catalog (retold-catalog.json). Using static sidebar.');
						return null;
					}
					return pResponse.json();
				})
				.then(function (pCatalog)
				{
					if (!pCatalog)
					{
						return;
					}

					_Catalog = pCatalog;

					// Build and apply aliases for cross-repo content fetching
					var tmpAliases = buildAliases(pCatalog);
					pVM.config.alias = Object.assign(pVM.config.alias || {}, tmpAliases);
				})
				.catch(function (pError)
				{
					console.warn('Retold: Error loading catalog:', pError);
				});

			// Fetch the keyword index
			fetch('retold-keyword-index.json')
				.then(function (pResponse)
				{
					if (!pResponse.ok)
					{
						console.warn('Retold: Could not load keyword index. Cross-module search disabled.');
						return null;
					}
					return pResponse.json();
				})
				.then(function (pIndexData)
				{
					if (!pIndexData)
					{
						return;
					}

					_KeywordIndex = pIndexData;
					_Documents = pIndexData.Documents;

					// Load the lunr index
					if (pIndexData.LunrIndex && typeof(lunr) !== 'undefined')
					{
						_LunrIndex = lunr.Index.load(pIndexData.LunrIndex);
					}
				})
				.catch(function (pError)
				{
					console.warn('Retold: Error loading keyword index:', pError);
				});
		});

		// Override sidebar rendering when we have a catalog
		pHook.beforeEach(function (pContent, pNext)
		{
			pNext(pContent);
		});

		// Generate dynamic sidebar based on current route
		pHook.doneEach(function ()
		{
			if (!_Catalog)
			{
				return;
			}

			var tmpRoute = window.location.hash.replace(/^#/, '');
			var tmpParsed = parseRoute(tmpRoute);

			// Update sidebar with module-specific navigation when viewing a module
			if (tmpParsed)
			{
				for (var i = 0; i < _Catalog.Groups.length; i++)
				{
					if (_Catalog.Groups[i].Key === tmpParsed.Group)
					{
						var tmpModuleSidebar = buildModuleSidebar(_Catalog, _Catalog.Groups[i], tmpParsed.Module);

						if (tmpModuleSidebar)
						{
							// Find the sidebar element and update it
							var tmpSidebarEl = document.querySelector('.sidebar-nav');
							if (tmpSidebarEl && typeof(window.$docsify) !== 'undefined')
							{
								// Store the module sidebar for Docsify to render
								window._retoldModuleSidebar = tmpModuleSidebar;
							}
						}
						break;
					}
				}
			}
		});

		// Add cross-module search UI
		pHook.mounted(function ()
		{
			// Create search input for cross-module search
			var tmpSearchContainer = document.createElement('div');
			tmpSearchContainer.className = 'retold-search-container';
			tmpSearchContainer.innerHTML = [
				'<div class="retold-search">',
				'<input type="text" class="retold-search-input" placeholder="Search across all modules..." />',
				'<div class="retold-search-results-container" style="display:none;"></div>',
				'</div>'
			].join('');

			var tmpSidebar = document.querySelector('.sidebar');
			if (tmpSidebar)
			{
				var tmpSidebarNav = tmpSidebar.querySelector('.sidebar-nav');
				if (tmpSidebarNav)
				{
					tmpSidebar.insertBefore(tmpSearchContainer, tmpSidebarNav);
				}
			}

			// Wire up search
			var tmpInput = tmpSearchContainer.querySelector('.retold-search-input');
			var tmpResultsContainer = tmpSearchContainer.querySelector('.retold-search-results-container');

			if (tmpInput && tmpResultsContainer)
			{
				var tmpDebounceTimer = null;

				tmpInput.addEventListener('input', function ()
				{
					clearTimeout(tmpDebounceTimer);
					var tmpQuery = tmpInput.value.trim();

					if (tmpQuery.length < 2)
					{
						tmpResultsContainer.style.display = 'none';
						tmpResultsContainer.innerHTML = '';
						return;
					}

					tmpDebounceTimer = setTimeout(function ()
					{
						var tmpResults = searchKeywords(tmpQuery);
						tmpResultsContainer.innerHTML = renderSearchResults(tmpResults);
						tmpResultsContainer.style.display = 'block';
					}, 300);
				});

				// Close search results when clicking outside
				document.addEventListener('click', function (pEvent)
				{
					if (!tmpSearchContainer.contains(pEvent.target))
					{
						tmpResultsContainer.style.display = 'none';
					}
				});
			}
		});
	}

	// Register as Docsify plugin
	window.$docsify = window.$docsify || {};
	window.$docsify.plugins = (window.$docsify.plugins || []).concat(RetoldDocsPlugin);
})();
