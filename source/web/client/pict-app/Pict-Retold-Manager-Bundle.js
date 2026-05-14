module.exports =
{
	RetoldManagerApplication: require('./Pict-Application-RetoldManager.js')
};

if (typeof(window) !== 'undefined')
{
	window.RetoldManagerApplication = module.exports.RetoldManagerApplication;
}
