AppRegistry.registerBundle({applicationId:'StatSelector|2.2.16',bundle: {}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/select',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<label class="availableToScreenReader" for="period_'+
((__t=( category ))==null?'':_.escape(__t))+
'">'+
((__t=( label ))==null?'':_.escape(__t))+
'</label>\r\n<select id="period_'+
((__t=( category ))==null?'':_.escape(__t))+
'" name="period">\r\n  <option value="-">'+
((__t=( label ))==null?'':_.escape(__t))+
'</option>\r\n  ';
 _.each(opValues, function(opVal) { 
__p+='\r\n  <option value="'+
((__t=( opVal ))==null?'':_.escape(__t))+
'">'+
((__t=( opVal ))==null?'':_.escape(__t))+
'</option>\r\n  ';
 }) 
__p+='\r\n</select>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/GT',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="articlexintro">\r\n	Tidsserie\r\n</div>\r\n<div>\r\n	'+
((__t=( ts_GT ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/uppklaradePrel',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        HalvÃ¥rsstatistik Ã¶ver uppklarade brott efter brottstyp och typ av beslut\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar preliminÃ¤r halvÃ¥rsstatistik Ã¶ver uppklarade brott efter brottstyp, typ av beslut (t ex beslut om att vÃ¤cka Ã¥tal), personuppklaring och uppklaring. (Fr.o.m.  Ã¥r 2005 med undantag fÃ¶r 2007. Under Ã¥r 2007 togs inte halvÃ¥rsstatistiken fram pÃ¥ grund av infÃ¶rande av nytt Ã¤rendehanteringssystem hos Ãklagarmyndigheten.)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_171, prefix: '171'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        HalvÃ¥rsstatistik Ã¶ver tekniskt uppklarade brott\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar preliminÃ¤r halvÃ¥rsstatistik Ã¶ver tekniskt uppklarade brott dÃ¤r misstÃ¤nkt person inte finns, totalt och efter brottstyp samt efter beslut/nedlÃ¤ggningsbeslut. (Fr.o.m. Ã¥r 2010.)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_151, prefix: '151'}) ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/visaStatistikMall',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="statselectorsection">\r\n	<div class="articlexheadline">'+
((__t=( statType ))==null?'':_.escape(__t))+
'</div>\r\n	<div class="modulexlinkxstatistics">'+
((__t=( statSubType ))==null?'':_.escape(__t))+
'</div>\r\n	<div class="modulexdatexstatistics">'+
((__t=( statContext ))==null?'':_.escape(__t))+
'</div>\r\n\r\n	';
 if ((typeof(downloadLink) !== "undefined")|| (typeof(pdfPath) !== "undefined") ){ 
__p+='\r\n	<div class="filedownloadbackground articlextext">\r\n		<div>\r\n			';
 if (statType == "Utsatta omrÃ¥den") { 
__p+='\r\n			<a class="modulexlink" href="javascript:history.go(-1);">Tillbaka till '+
((__t=( statType ))==null?'':_.escape(__t))+
'</a>\r\n			';
 } else { 
__p+='\r\n			<a class="modulexlink" href="javascript:history.go(-1);">Tillbaka till fÃ¶regÃ¥ende webbsida</a>\r\n			';
 } 
__p+='\r\n		</div>\r\n	</div>\r\n	';
 } 
__p+='\r\n\r\n\r\n	<div id="statfiles" class="download">\r\n		';
 if (typeof(downloadLink) !== "undefined") { 
__p+='\r\n\r\n		<div style="margin-bottom:8px;margin-top:12px;">\r\n			<img src='+
((__t=( statIconXls ))==null?'':__t)+
'>\r\n			'+
((__t=( downloadLink ))==null?'':__t)+
'\r\n		</div>\r\n		';
 } 
__p+='\r\n\r\n		';
 if (typeof(pdfLink) !== "undefined") { 
__p+='\r\n		<div>\r\n			<img src='+
((__t=( statIconPdf ))==null?'':__t)+
'>\r\n			'+
((__t=( pdfLink ))==null?'':__t)+
'\r\n			<div class="statFileComment">'+
((__t=( pdfComment ))==null?'':__t)+
'</div>\r\n		</div>\r\n		';
 } 
__p+='\r\n\r\n		';
 if (typeof(pdfExtraLink) !== "undefined") { 
__p+='\r\n		<br/>\r\n		<div>\r\n			<img src='+
((__t=( statIconPdf ))==null?'':__t)+
'>\r\n			'+
((__t=( pdfExtraLink ))==null?'':__t)+
'\r\n			<div class="statFileComment">'+
((__t=( pdfExtraComment ))==null?'':__t)+
'</div>\r\n		</div>\r\n		';
 } 
__p+='\r\n\r\n		';
 if (typeof(htmlFile) !== "undefined" ) { 
__p+='\r\n\r\n		<div class="stat-html-link" >\r\n			<i class="fa fa-table" aria-hidden="true"></i>\r\n			<a id="btndialog" href=\'javascript:void(0)\' class="modulexlink" onclick="showDialog(); return false;">Visa urval i fÃ¶nster</a>\r\n		</div>\r\n		<div id=\'statistikVisare\' class=\'modulexdatexstatistics\' style=\'display: none\'> '+
((__t=( htmlFile ))==null?'':__t)+
'</div>\r\n		';
 } 
__p+='\r\n\r\n	</div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/lagforda',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudbrott och huvudpÃ¥fÃ¶ljd\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller fÃ¶r alla i hela landet finns frÃ¥n Ã¥r 1995. Tabeller fÃ¶r alla pÃ¥ lÃ¤nsnivÃ¥ finns frÃ¥n Ã¥r 2000, tabeller fÃ¶r kvinnor i hela landet finns frÃ¥n Ã¥r 1995, fÃ¶r ungdomar fÃ¶r hela landet frÃ¥n Ã¥r 1999 och fÃ¶r mÃ¤n fÃ¶r hela landet frÃ¥n Ã¥r 2009.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPopRegionLagforda', {perioder: perioder_420, populationer: genderListYouth, prefix: '420', category: '420', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudpÃ¥fÃ¶ljd och Ã¥lder\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller finns fÃ¶r alla i hela landet frÃ¥n Ã¥r 1995, fÃ¶r kvinnor frÃ¥n Ã¥r 1996 och fÃ¶r mÃ¤n frÃ¥n 2009.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_440, prefix: '440', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudbrott och Ã¥lder\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller finns fÃ¶r alla i hela landet frÃ¥n Ã¥r 1995, fÃ¶r kvinnor frÃ¥n Ã¥r 1996 och fÃ¶r mÃ¤n frÃ¥n 2009.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_450, prefix: '450', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudpÃ¥fÃ¶ljd och tidigare belastning\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_470, prefix: '470', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudbrott och tidigare belastning\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_470, prefix: '471', category: 470, genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudbrott och region\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller till och med Ã¥r 2014 redovisar huvudbrott och lÃ¤n.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_460, prefix: '460', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudpÃ¥fÃ¶ljd och region\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller till och med Ã¥r 2014 redovisar huvudpÃ¥fÃ¶ljd och lÃ¤n.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_461, prefix: '461', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut efter huvudbrott, totalt samt andel kvinnor, mÃ¤n, ungdomar och utvisningsbeslut\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_490, prefix: '490', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	Samtliga domslut. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut efter huvudbrott och tingsrÃ¤tt\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_520, prefix: '522a1', category: '520'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut efter huvudpÃ¥fÃ¶ljd och tingsrÃ¤tt\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_520, prefix: '522a2', category: '520'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<!-- Ny selektor frÃ¥n 2014-->\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut i tingsrÃ¤tt efter pÃ¥fÃ¶ljd och pÃ¥fÃ¶ljdskombinationer\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabellen fÃ¶r Domslut i tingsrÃ¤tt efter pÃ¥fÃ¶ljd och pÃ¥fÃ¶ljdskombinationer ses fÃ¶rnÃ¤rvarande Ã¶ver och Ã¤r dÃ¤rfÃ¶r inte tillgÃ¤nglig. FÃ¶r mer information kontakta statistik@bra.se.\r\n	</div>\r\n</div>\r\n<br />\r\n<div class="articlexintro">\r\n	Domslut med pÃ¥fÃ¶ljd fÃ¤ngelse. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut med pÃ¥fÃ¶ljd fÃ¤ngelse efter huvudbrott och fÃ¤ngelsetidens lÃ¤ngd i mÃ¥nader\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller finns fÃ¶r alla i hela landet frÃ¥n Ã¥r 1995, fÃ¶r kvinnor frÃ¥n Ã¥r 1995 och fÃ¶r mÃ¤n frÃ¥n Ã¥r 2009.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_430, prefix: '430', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut med pÃ¥fÃ¶ljd fÃ¤ngelse efter huvudbrott och fÃ¤ngelsetidens lÃ¤ngd i Ã¥r\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_432, prefix: '432'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut med pÃ¥fÃ¶ljd fÃ¤ngelse efter Ã¥lder och fÃ¤ngelsetidens lÃ¤ngd\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_435, prefix: '435', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut med pÃ¥fÃ¶ljd fÃ¤ngelse efter huvudbrott och tidigare belastning\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_470, prefix: '472', category: '470', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n\r\n<div class="articlexintro">\r\n	Domslut med pÃ¥fÃ¶ljd sluten ungdomsvÃ¥rd. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut med pÃ¥fÃ¶ljden sluten ungdomsvÃ¥rd efter brott och strafftidens lÃ¤ngd\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_430_suv, prefix: '430suv', category: '430'}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="articlexintro">\r\n	Meddelade Ã¥talsunderlÃ¥telser/straffÃ¶relÃ¤gganden. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Meddelade Ã¥talsunderlÃ¥telser, efter huvudbrott och beslutsgrund\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabellerna finns fÃ¶r alla frÃ¥n Ã¥r 1995. Tabeller fÃ¶r alla pÃ¥ Ã¥klagarnivÃ¥ finns frÃ¥n Ã¥r 2009, och fÃ¶r kvinnor hela landet samt mÃ¤n hela landet frÃ¥n Ã¥r 2009.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_500, prefix: '501', category: '500', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Meddelade Ã¥talsunderlÃ¥telser/straffÃ¶relÃ¤gganden efter Ã¥klagarkammare och huvudbrott\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_520, prefix: '523a1', category: '520'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Meddelade Ã¥talsunderlÃ¥telser/straffÃ¶relÃ¤gganden efter Ã¥klagarkammare och huvudpÃ¥fÃ¶ljd\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_520, prefix: '523a2', category: '520'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	GodkÃ¤nda ordningsbotsfÃ¶relÃ¤gganden. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		GodkÃ¤nda ordningsbotsfÃ¶relÃ¤gganden, efter Ã¥lder och typ av Ã¶vertrÃ¤delse\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_710, prefix: '710', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	LagfÃ¶rda brott\r\n</div>\r\n\r\n<div class="modulexdatexstatistics">\r\n	Med lagfÃ¶rda brott avses samtliga brott som enskilda individer lagfÃ¶rts fÃ¶r. Dessa bygger pÃ¥ antal brott i lagfÃ¶ringsbeslut vilket innebÃ¤r att om samma brott begicks av tre personer tillsammans sÃ¥ rÃ¤knas de som tre lagfÃ¶rda brott.\r\n</div>\r\n<br />\r\n<div class="articlexintro">\r\n	Samtliga lagfÃ¶rda brott. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶rda brott efter brott, lagfÃ¶ringstyp och kÃ¶n\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_400, prefix: '405', category: '400', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	LagfÃ¶rda brott i domstol. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶rda brott efter brott och brottstidpunkt\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_490, prefix: '491', category: '490'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	Beslutade pÃ¥fÃ¶ljder\r\n</div>\r\n\r\n<div class="modulexdatexstatistics">\r\n	Med pÃ¥fÃ¶ljder avses samtliga pÃ¥fÃ¶ljder som utdÃ¶mts i tingsrÃ¤tt inklusive samtliga pÃ¥fÃ¶ljder som godkÃ¤nts genom straffÃ¶relÃ¤ggande.\r\n</div>\r\n<br/>\r\n<div class="articlexintro">\r\n	BÃ¶tespÃ¥fÃ¶ljder. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		BÃ¶tespÃ¥fÃ¶ljder efter huvudbrott och bÃ¶ternas art och storlek\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_500, prefix: '500', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/main',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+=''+
((__t=( renderer.renderComponent(stattyp) ))==null?'':__t)+
'\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/malsagare',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="articlexintro">\r\n    MÃ¥lsÃ¤gare vid brottsanmÃ¤lan\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        <br />\r\n        Hela tabellverket\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Samtliga statistiktabeller fÃ¶r statistiken.\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_MA, prefix: 'MA-tabellverk', category: 'malsagare'}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="articlexintro">\r\n    Tidsserie\r\n</div>\r\n<div>\r\n    '+
((__t=( ts_MA ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formPeriodRegion',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formPeriodRegion" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="lanFromYear" value="'+
((__t=( lanFromYear ))==null?'':__t)+
'" />\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period">\r\n        <option value="-">VÃ¤lj period</option>\r\n        ';
 _.each(perioder, function(period) { 
__p+='\r\n        <option value="'+
((__t=( period ))==null?'':_.escape(__t))+
'">'+
((__t=( period ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      <label class="availableToScreenReader" for="region_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj omrÃ¥de</label>\r\n      <select id="region_'+
((__t=( prefix ))==null?'':__t)+
'" name="region" disabled="disabled">\r\n        <option value=\'-\'>VÃ¤lj omrÃ¥de</option>\r\n      </select>\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formPeriodEng',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formPeriod" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">Select period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period">\r\n        <option value="-">Select period</option>\r\n        ';
 _.each(perioder, function(period) { 
__p+='\r\n        <option value="'+
((__t=( period ))==null?'':_.escape(__t))+
'">'+
((__t=( period ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formPeriodEng',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      client   = require('/module/client/client'),
      template   = require('/template/component/formPeriodEng');

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         if (category === undefined) {
            category = options.prefix;
         }
         return _.extend({}, {perioder: options.perioder, category: category, prefix: options.prefix})
      },
      events: {
         dom: {
            'submit form': 'handleSubmitFormPeriodEng'
         },
      },
      handleSubmitFormPeriodEng: function(e) {
         e.preventDefault();
         let form = $(e.target);
         let cat = form.find("[name='category']").val();
         let prefix = form.find("[name='prefix']").val();
         let period = form.find("[name='period']").val();
         let divurl;
         if (prefix === '420-eng'){
            divurl = "engelska/" + cat + "/" + prefix + "-" + period;
         } else {
            divurl = "engelska/" + cat + "/" + prefix + "_" + period;
         }

         client.loadurlandshow(divurl,form);
         return false;
      }
   });
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/utsattaomraden',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Resultat frÃ¥n Nationella trygghetsundersÃ¶kningen\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller som visar andel personer utsatta fÃ¶r brott (2006-2013), andel som kÃ¤nner otrygghet och oro fÃ¶r brott, andel som kÃ¤nner fÃ¶rtroende fÃ¶r polis samt redovisning av urvalets storlek i NTU (2007-2014). SÃ¤rredovisning fÃ¶r URBAN15-omrÃ¥dena, fÃ¶r kommuner och lÃ¤n som omfattas av URBAN15-omrÃ¥de samt fÃ¶r hela landet.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_Ntu, prefix: 'Tabell1', category: 'utsattaomraden'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		AnmÃ¤lda brott* i URBAN15-omrÃ¥dena\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller som visar antal anmÃ¤lda brott totalt och per 100 000 invÃ¥nare, efter brottstyp, i URBAN15-omrÃ¥den, i kommuner och lÃ¤n som omfattas av URBAN15-omrÃ¥de samt i hela landet. Ãren 2008-2010 redovisas efter LUA-omrÃ¥den.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_Urban, prefix: 'Tabell1A', category: 'utsattaomraden'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		AnmÃ¤lda brott* i hela landet\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller som visar antal anmÃ¤lda brott totalt och per 100 000 invÃ¥nare, efter brottstyp, i hela landet och hela landet exklusive URABAN15-omrÃ¥dena samt totalt i alla URBAN15-omrÃ¥den. Ãren 2008-2010 redovisas efter LUA-omrÃ¥den.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_Landet, prefix: 'Tabell1B', category: 'utsattaomraden'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		AnmÃ¤lda brott â information om bortfall\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller som visar information om bortfall i statistiken Ã¶ver anmÃ¤lda brott, efter brottstyp, i kommuner och lÃ¤n som omfattas av URBAN15-omrÃ¥de samt i hela landet. Bortfall syftar pÃ¥ bortfall av SAMS-kod fÃ¶r vilken indelning i URBAN15-omrÃ¥den baseras pÃ¥ i statistiken Ã¶ver anmÃ¤lda brott. Ãren 2008-2010 redovisas efter LUA-omrÃ¥den.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_Bortfall, prefix: 'Tabell2', category: 'utsattaomraden'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="modulexdatexstatistics">\r\n	* Observera att endast de anmÃ¤lda brott fÃ¶r vilka uppgift om delomrÃ¥de (SAMS-kod) finns redovisas. FÃ¶r mer information se ovan AnmÃ¤lda brott â information om bortfall.\r\n</div>\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formAterfall',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      template   = require('/template/component/formAterfall'),
      client   = require('/module/client/client');

   let tableInfo;

   let populationer = [
      {id: 'all', text: 'Alla'},
      {id: 'female', text: 'Kvinnor'},
      {id: 'male', text: 'MÃ¤n'}
   ]

   return Component.extend({

      template: template,
      filterState: function (state, options) {
         let category = "aterfall";
         tableInfo = options.tableInfo;
         return _.extend({}, {
                variables: options.variables,
                populationer: populationer,
                prefix: options.prefix,
                category: category,
                tableInfo: tableInfo
             }
         )
      },
      events: {
         dom: {
            'change [name=variabel]': 'changeVar_aterfall',
            'change [name=population]': 'changePop_aterfall',
            'submit form': 'handleSubmit'
         },
      },
      changeVar_aterfall: function(e) {
         let target = $(e.target);
         let valdVariabel =target.val();

         let nextPopulation = $(e.target.parentNode).find("select[name=population]");
         let nextYear = $(e.target.parentNode).find("select[name=period]");
         let year = "";
         let table = tableInfo[valdVariabel];
         let disablePop = "";

         if (table) {
            disablePop = table.population;
            year = table.year;
         }

         nextYear.empty();
         nextYear.append("<option value='0'>VÃ¤lj period</option>");

         if(valdVariabel == "-") {
            nextPopulation[0].selectedIndex = 0;
            nextPopulation.attr("disabled", true);
            nextYear.attr("disabled", true);
         } else if(disablePop){
            nextPopulation[0].selectedIndex = 0;
            nextPopulation.attr("disabled", true);
            nextYear.append(year);
            nextYear.attr("disabled", false);
         }else {
            nextYear.attr("disabled", true);
            nextPopulation.attr("disabled", false);
         }
      },
      changePop_aterfall: function (e) {

         let target = $(e.target);
         let valdPopulation =target.val();
         let nextPeriod = $(e.target.parentNode).find("select[name=period]");
         let valdVariabel = $(e.target.parentNode).find("select[name=variabel]");
         let table = tableInfo[valdVariabel.val()];

         if(valdPopulation == "-") {
            nextPeriod.attr("disabled", true);
         } else{
            nextPeriod.empty();
            nextPeriod.append("<option value='0'>VÃ¤lj period</option>");
            nextPeriod.append(table.year);
            nextPeriod.attr("disabled", false);

         }
      },
      handleSubmit: function(e) {
         let form = $(e.target);
         let cat = form.find("[name='category']").val();
         let prefix = form.find("[name='prefix']").val();
         let population = form.find("[name='population']").val();
         let period = form.find("[name='period']").val();
         let variable = form.find("[name='variabel']").val();
         let divurl;

         if (typeof variable == "undefined") {
            variable = prefix;
         }

         if (typeof population != "undefined" && population !== "all" && population !== "-") {
            population = ("female" === population ? "_k" : "_m")
         } else {
            population = "";
         }

         divurl = cat + "/"  + variable + "/"+ variable + "La" + population + "-" + period;

         client.loadurlandshow(divurl,form);
      }

   });
});


}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formVariabelPeriod',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      client   = require('/module/client/client'),
      template   = require('/template/component/formVariabelPeriod');
   let tableInfo;

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         tableInfo = options.tableInfo;
         if (category === undefined) {
            category = options.prefix;
         }

         return _.extend({}, {variables: options.variables, prefix: options.prefix, category: category,hidePeriod: options.hidePeriod, tableInfo: tableInfo })
      },events: {
         dom: {
            'change [name=variabel]': 'changeVariabel_VariabelPeriod',
            'submit form': 'handleSubmit'
         },
      },

      changeVariabel_VariabelPeriod: function(e) {
         let target = $(e.target);
         let valdVariabel =target.val();

         let nextYear = $(e.target.parentNode).find("select[name=period]");
         let year = "";
         let table = tableInfo[valdVariabel];
         let disableYear = "";
         if (table) {
            disableYear = table.disableyear;
            year = table.year;
         }

         nextYear.empty();
         if(valdVariabel == "-") {
            nextYear.append("<option value='0'>VÃ¤lj period</option>");
            nextYear.attr("disabled", true);
         } else if(disableYear){
            let yearlabel = year.substring(year.indexOf("_") + 1);
            nextYear.append("<option value='0'>" + yearlabel + "</option>");
            nextYear.attr("disabled", false);
         }else {
            nextYear.append("<option value='0'>VÃ¤lj period</option>");
            nextYear.append(year);
            nextYear.attr("disabled", false);
         }

      },

      handleSubmit: function(e) {
         let form = $(e.target);
         let cat = form.find("[name='category']").val();
         let prefix = form.find("[name='prefix']").val();
         let variable = form.find("[name='variabel']").val();
         let period = form.find("[name='period']").val();
         let divurl;
         if (typeof variable == "undefined") {
            variable = prefix;
         }
         if (typeof period == "undefined" || period === "0") {
            let table = tableInfo[variable];
            divurl = variable + "/" + table.year;
         } else {
            divurl = variable + "/" + period + "/" + variable + "-" + period;
         }

         client.loadurlandshow(divurl,form);
      }

   });
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formHatbrott',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formAterfall" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n      ';
 if (showPeriod) { 
__p+='\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period" >\r\n        <option value="-">VÃ¤lj period</option>\r\n        <option value="2018">2018</option>\r\n        <option value="2016">2016</option>\r\n        <option value="2015">2015</option>\r\n        <option value="2014">2014</option>\r\n        <option value="2013">2013</option>\r\n        <option value="2012">2012</option>\r\n        <option value="2011">2011</option>\r\n        <option value="2010">2010</option>\r\n        <option value="2009">2009</option>\r\n      </select>\r\n      ';
 } 
__p+='\r\n      <label class="availableToScreenReader" for="region_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj omrÃ¥de</label>\r\n      <select id="region_'+
((__t=( prefix ))==null?'':__t)+
'" name="region" ';
 if (showPeriod) { 
__p+=' disabled="disabled" ';
 } 
__p+=' >\r\n        <option value=\'-\'>VÃ¤lj omrÃ¥de</option>\r\n        ';
 _.each(variables, function(variable) { 
__p+='\r\n        <option value="'+
((__t=( variable.id ))==null?'':_.escape(__t))+
'">'+
((__t=( variable.text ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formPeriodPop1Pop2Region',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\n\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formPeriodPop1Pop2Region" class="statform" action="" method="get">\n    <div>\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\n      <input type="hidden" name="lanFromYear" value="'+
((__t=( lanFromYear ))==null?'':__t)+
'" />\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period_pp1p2r">\n        <option value="-">VÃ¤lj period</option>\n        ';
 _.each(perioder, function(period) { 
__p+='\n        <option value="'+
((__t=( period ))==null?'':_.escape(__t))+
'">'+
((__t=( period ))==null?'':_.escape(__t))+
'</option>\n        ';
 }) 
__p+='\n      </select>\n      <label class="availableToScreenReader" for="population1_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj '+
((__t=( pop1Title ))==null?'':__t)+
'</label>\n      <select id="population1_'+
((__t=( prefix ))==null?'':__t)+
'" name="population1" disabled="disabled">\n        <option value=\'-\'>VÃ¤lj '+
((__t=( pop1Title ))==null?'':__t)+
'</option>\n        ';
 _.each(populationer1, function(population1) { 
__p+='\n        <option value="'+
((__t=( population1.id ))==null?'':_.escape(__t))+
'">'+
((__t=( population1.text ))==null?'':_.escape(__t))+
'</option>\n        ';
 }) 
__p+='\n      </select>\n      <label class="availableToScreenReader" for="population2_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj '+
((__t=( pop2Title ))==null?'':__t)+
'</label>\n      <select id="population2_'+
((__t=( prefix ))==null?'':__t)+
'" name="population2" disabled="disabled">\n        <option value=\'-\'>VÃ¤lj '+
((__t=( pop2Title ))==null?'':__t)+
'</option>\n        ';
 _.each(populationer2, function(population2) { 
__p+='\n        <option value="'+
((__t=( population2.id ))==null?'':_.escape(__t))+
'">'+
((__t=( population2.text ))==null?'':_.escape(__t))+
'</option>\n        ';
 }) 
__p+='\n      </select>\n      <label class="availableToScreenReader" for="region_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj omrÃ¥de</label>\n      <select id="region_'+
((__t=( prefix ))==null?'':__t)+
'" name="region" disabled="disabled">\n        <option value=\'-\'>VÃ¤lj omrÃ¥de</option>\n      </select>\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\n    </div>\n  </form>\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\n  </div>\n</div>\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/recidivism',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div>\r\n	'+
((__t=( ts_811 ))==null?'':__t)+
'<p>\r\n	'+
((__t=( ts_812 ))==null?'':__t)+
'<p>\r\n	'+
((__t=( ts_833 ))==null?'':__t)+
'<p>\r\n	'+
((__t=( ts_851 ))==null?'':__t)+
'<p>\r\n</div>\r\n\r\n\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formPeriodPop',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      client_lagforda   = require('/module/client/client_lagforda'),
      client   = require('/module/client/client'),
      template   = require('/template/component/formPeriodPop');
   let genderMap;

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         let lanFromYear = options.lanFromYear;
         genderMap = options.genderMap;

         if (category === undefined) {
            category = options.prefix;
         }
         if (lanFromYear === undefined) {
            lanFromYear = "";
         }

         return _.extend({}, {perioder: options.perioder, prefix: options.prefix, category: category, lanFromYear: lanFromYear, genderMap: genderMap})
      },events: {
         dom: {
            'change [name=period]': 'changePeriod_PeriodPop',
            'change [name=population]': 'changePop_PeriodPop',
            'submit form': 'handleSubmit'
         },
      },

      changePeriod_PeriodPop: function(e) {
         e.preventDefault();
         let target = $(e.target);
         let valdPeriod =target.val();
         let nextPop = $(e.target.parentNode).find("select[name=population]");
         let category = $(e.target.parentNode).find("input[name=category]");

        if (!nextPop.disabled) {
            nextPop[0].selectedIndex = 0;
         }
         if(valdPeriod == "-") {
            nextPop.attr("disabled", true);
         } else{
            if (category.val() == '600') {
               category = $(e.target.parentNode).find("input[name=prefix]");
            }
            nextPop.empty().append("<option value='-'>VÃ¤lj population</option><option value='all'>Alla</option>", client_lagforda.getPopulationList(valdPeriod, category ,genderMap));
            nextPop.attr("disabled", false);
         }
      },
      changePop_PeriodPop: function(e) {
         return false;
      },
      handleSubmit: function(e) {
         let form = $(e.target);
         let cat = form.find("[name='category']").val();
         let prefix = form.find("[name='prefix']").val();
         let population = form.find("[name='population']").val();
         let period = form.find("[name='period']").val();
         let divurl;
         let region = "La";
         if (cat == "600" && population != "all") {
            region = ""
         }
         prefix = client.parseGenderValue(population,prefix,region);
         divurl = cat + "/" + period + "/" + prefix + region + "-" + period;

         client.loadurlandshow(divurl,form);
      }

   });
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/module/client/client',module:function(define){'use strict';
define(function (require) {
   'use strict';

   return {

       submitFormAnmaldaPrel: function (form) {
    	  let cat = form.find("[name='category']").val();
    	  let region = form.find("[name='region']").val();
		  let period = form.find("[name='period']").val();
		  let year = period.substring(period.lastIndexOf("-") + 1);
		  let divurl;
		   if (!region) {
			   region = "";
		   }

		   if(cat === "P2"){
			  divurl = region + "/" + year + "/" + region + period;
		   } else if (cat === "P4") {
			   if (period.startsWith("P4", 8)) {
				   divurl = period.replace("Region", region)
			   } else {
				   divurl = period;
			   }
		   } else {
			  divurl = cat + "/" + year + "/" + cat + region + period;
		   }
		   this.loadurlandshow(divurl,form);
		   return false;
       },
	   submitFormPopRegPer: function (e) {
		   e.preventDefault();
		   let form = $(e.target);
		   let cat = form.find("[name='category']").val();
		   let prefix = form.find("[name='prefix']").val();
		   let population = form.find("[name='population']").val();
		   let region = form.find("[name='region']").val();
		   let period = form.find("[name='period']").val();

		   if (typeof region == "undefined") {
			   region = "la";
		   }
		   let divurl = cat + "/" + period + "/" + prefix + region + "-" + period;

		   this.loadurlandshow(divurl,form);
		   return false;
	   },
	   parseGenderValue: function(population,prefix,region) {
		let all = "all";

		if (population === '-') {
			return '';
		}

		if (typeof population != "undefined" && population !== all) {
			let male = "male";
			let female = "female";
			let youth = "youth";
			let url = "";
			let suffix = "";
			switch(prefix) {
				case "200":
				case "210":
					url += new Number(parseInt(prefix) + (female === population ? 2 : 1)).toString();
					break;
				case "220":
				case "230a":
				case "230b":
				case "240":
				case "260":
					url += new Number(parseInt(prefix) + (female === population ? 1 : 2)).toString() + prefix.substring(3);
					break;
				case "260a":
					url += new Number(parseInt(prefix) + (female === population ? 1 : 2)).toString();
					break;
				case "405":
					url += prefix + (female === population ? "b" : "c");
					break;
				case "420":
					switch(population) {
						case female:
							if(region.toLowerCase() != "la"){
								url += new Number(parseInt(prefix)).toString()+"b";
							} else {
								url += new Number(parseInt(prefix) + 1).toString();
							}
							break;
						case male:
							if(region.toLowerCase() != "la"){
								url += new Number(parseInt(prefix)).toString()+"c";
							}else{
								url += new Number(parseInt(prefix) + 3).toString();
							}
							break;
						case youth:
							url += new Number(parseInt(prefix) + 2).toString();
							break;
						default:
							url += prefix;
							break;
					}
					break;
				case "430":
					url += new Number(parseInt(prefix) + (female === population ? 1 : 4)).toString();
					break;
				case "435":
					switch(population) {
						case female:
							url += new Number(parseInt(prefix) + 1).toString();
							break;
						case male:
							url += new Number(parseInt(prefix) + 2).toString();
							break;
					}
					break;
				case "440":
				case "450":
					// Note, not the same as 210
					url += new Number(parseInt(prefix) + (female === population ? 1 : 2)).toString();
					break;
				case "460":
				case "461":
				case "470":
				case "471":
				case "472":
				case "500":
				case "501":
				case "710":
					url += prefix + (female === population ? "b" : "c");
					break;
				case "624":
				case "626":
				case "630":
					switch (population) {
						case "female":
							url += new Number(parseInt(prefix) + 1).toString() + "La" + "_k";
							break;
						case "male":
							url += new Number(parseInt(prefix) + 1).toString() + "La" + "_m";
							break;
						default:
							url += prefix + "La"
					}
					break;
			}
			return url;
		}
		return prefix;
	},
	   loadurlandshow: function (url, form, selectedText) {
		   if (selectedText == null) {
			   selectedText = this.selectedValues(form);
		   }
		   url = "/statistik_sidor/" + url + ".html";
		   console.log(selectedText);
		   console.log(url);
		   $(".statisticsdownload > div:first-child").replaceWith("<div id='download' class='download'></div>");
		   $(".statisticsdownload").hide();
		   var statDownload = form.parent().find("[id^=statisticsdownload]");
		   statDownload.find("#download").replaceWith("<div id ='download' class='download'><div class='selectedHeader'>" + selectedText + "</div><div id='selectedFiles'></div></div>");
		   statDownload.find("#selectedFiles").load(url + " #statfiles");
		   statDownload.show();
	   },
     	loadhtmlfile: function (url,form) {
     	        url = "/statistik_sidor" + url + ".html #statistikVisare";
     	        var dialogtarget = form.parent().find("#dialogtarget");
     			  dialogtarget.load(url);
     	},
     	selectedValues:	function (form) {
     			var text = '';
     			form.find('select').each(function(index) {
     	   		if ($(this).prop('disabled') == false) {
     	   			if (index > 0) text += ', ';
     	   		   text += $(this).find("option").eq($(this)[0].selectedIndex).text();
     	   		}
     			 });
     			return text;
     	},
	   setDisableFormElement: function(e, elementname, value) {
		   let element = $(e.target.parentNode).find("select[name='" + elementname + "']");
		   element.attr("disabled", value);
	   },
	   changeEnableNext: function (e, elementname) {
		   let vald = $(e.target).val();

		   if (vald == "-") {
			   this.setDisableFormElement(e, elementname, true);
		   }  else {
			   this.setDisableFormElement(e, elementname, false);
		   }
	   },
	   updateOptions: function (e, selectorname, options) {
		   let selector = $(e.target.parentNode).find("select[name='" + selectorname+ "']");
		   selector.empty();
		   selector.append(options);
	   },
	   parseForm: function(e) {
		   let formMap = new Map();
		   for (const element of e.target.elements) {
			   formMap.set(element.name, element.value);
		   }
		   return formMap;
	   },
	   formvalue: function(e, elementname) {
		   return e.target.form.elements.namedItem(elementname).value;
	   }
    };
});

}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/module/client/client_lagforda',module:function(define){'use strict';
define(function (require) {
   'use strict';

   return {
	   getPopulationList: function(year, category, genderMap) {
		   let gender = genderMap[category.val()];
		   let genderList = "";
		   if ( gender.female == null || gender.male == null) {
			   return "<option value='female'>Kvinnor</option><option value='male'>MÃ¤n</option>";
		   }

		   if ( gender.female <= year) {
			   genderList += "<option value='female'>Kvinnor</option>";
		   }
		   if ( gender.male <= year) {
			   genderList += "<option value='male'>MÃ¤n</option>";
		   }

		   if (gender.youth != "" && gender.youth <= year) {
			   genderList += "<option value='youth'>Ungdomar</option>";
		   }
		   return genderList;
	   }
    };
});

}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/handlagdaBrottsmisstankar',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        Handlagda brottsmisstankar efter typ av handlÃ¤ggning, antal och andel lagfÃ¶rda brottsmisstankar, brottstyp och kÃ¶n. (tabell 260).\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Statistiken finns fÃ¶r hela landet frÃ¥n och med 2007 och fÃ¶r regionerna frÃ¥n och med 2015.\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodPopRegionLagforda', {perioder: perioder_260, prefix: '260', genderMap: genderMap}) ))==null?'':__t)+
'\r\n    <div class="modulexlinkxstatistics">\r\n        Handlagda brottsmisstankar efter typ av handlÃ¤ggning, antal och andel lagfÃ¶rda brottsmisstankar, brottstyp, kÃ¶n och Ã¥lder. (tabell 260a).\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Statistiken finns fÃ¶r brottsmisstankar efter Ã¥lder (15-17 Ã¥r, 18-20 Ã¥r, 21 Ã¥r eller Ã¤ldre) i regionerna och i hela landet. Statistiken finns frÃ¥n 2015.\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodPop1Pop2Region', {perioder: perioder_260a, populationer1: ageList, populationer2: genderList,
        prefix: '260a',category: '260', pop1Title: 'Ã¥lder', popTitle2: 'kÃ¶n'}) ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/personsFoundGuiltyOfOffences',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="PersonsFoundGuiltyOfOffencesDiv">\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics statisticheadline">\r\n			Total number of conviction decisions\r\n		</div>\r\n		<div class="modulexdatexstatistics statisticheadline">\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodEng', {perioder: perioder, prefix: '420-eng', category: 'lagforda'}) ))==null?'':__t)+
'\r\n	</div>\r\n	<div>\r\n\r\n		'+
((__t=( ts_41 ))==null?'':__t)+
'<p>\r\n		'+
((__t=( ts_42 ))==null?'':__t)+
'\r\n	</div>\r\n</div>\r\n\r\n\r\n\r\n\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/handlagdaSlutlig',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        <br />\r\n        Handlagda brott efter om utredning har bedrivits eller ej och typ av beslut (tabell 300)\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar Ã¥rlig statistik Ã¶ver handlagda brott efter om utredning har bedrivits eller om brotten har direktavskrivits, typ av beslut (t ex vÃ¤ckt Ã¥tal), lagfÃ¶ringsprocent och personuppklaringsprocent, och efter brottstyp. (Fr.o.m. helÃ¥r 2014)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_300, prefix: '300'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        Handlagda brott efter om en misstÃ¤nkt person har varit registrerad fÃ¶r brotten eller ej och typ av beslut (tabell 310)\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar Ã¥rlig statistik Ã¶ver handlagda brott efter om en misstÃ¤nkt person har varit registrerad fÃ¶r brotten eller ej, typ av beslut (t ex vÃ¤ckt Ã¥tal), och efter brottstyp. (Fr.o.m. helÃ¥r 2014)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_310, prefix: '310'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        Handlagda brott efter anmÃ¤lningsÃ¥r (tabell 320)\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar Ã¥rlig statistik Ã¶ver samtliga handlagda brott, personuppklarade brott samt Ã¶vriga handlagda brott efter anmÃ¤lningsÃ¥r, och efter brottstyp. (Fr.o.m.hel Ã¥r 2014)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_320, prefix: '320'}) ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/HR',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="articlexintro">\r\n	Tidsserie\r\n</div>\r\n<div>\r\n	'+
((__t=( ts_HR ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/lethalViolence',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="lethalViolence">\r\n\r\n	<div>\r\n		'+
((__t=( ts_total ))==null?'':__t)+
'<p>\r\n		'+
((__t=( ts_gender ))==null?'':__t)+
'<p>\r\n		'+
((__t=( ts_firearms ))==null?'':__t)+
'<p>\r\n		'+
((__t=( ts_region ))==null?'':__t)+
'<p>\r\n\r\n	</div>\r\n\r\n\r\n</div>\r\n\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/personsSuspectedOfOffences',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="PersonsSuspectedOfOffencesDiv">\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics statisticheadline">\r\n			Persons suspected of offences\r\n		</div>\r\n		<div class="modulexdatexstatistics statisticheadline">\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodEng', {perioder: perioder, prefix: 'Persons_suspected_of_offences', category: 'misstanktapersoner'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n</div>\r\n\r\n<div>\r\n\r\n</div>\r\n\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/aterfall',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿\r\n<div class="statxsubheadline">\r\n	Samtliga personer\r\n</div>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Antal/andel Ã¥terfall inom tre Ã¥r\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Antal/andel Ãterfall inom 1-3 Ã¥r (tabell 811-827)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'antal3arPerson', variables: ["S811", "S812", "S813", "S814", "S815", "S816", "S827"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Tid till Ã¥terfall\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Mediantid till fÃ¶rsta Ã¥terfall (tabell 833-836)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'tidPerson', variables: ["S833", "S834", "S835", "S836"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Antal Ã¥terfallshÃ¤ndelser\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Antal Ã¥terfallsbrott/lagfÃ¶ringar (tabell 851-858)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'antalHandelsePerson', variables: ["S851", "S852", "S853", "S854", "S855", "S856", "S857", "S858"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Mest ingripande pÃ¥fÃ¶ljd i ingÃ¥ngs- och Ã¥terfallshÃ¤ndelsen\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Antal och andel Ã¥terfall inom 3 Ã¥r, efter mest ingripande pÃ¥fÃ¶ljd i ingÃ¥ngs- och Ã¥terfallshÃ¤ndelsen (tabell 871-872)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'pafoljdPerson', variables: ["S871", "S872"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Mest ingripande pÃ¥fÃ¶ljd i ingÃ¥ngs- och Ã¥terfallshÃ¤ndelse efter kriminalvÃ¥rdspÃ¥fÃ¶ljd\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Antal och andel Ã¥terfall inom 3 Ã¥r, efter mest ingripande pÃ¥fÃ¶ljd i ingÃ¥ngs- och Ã¥terfallshÃ¤ndelse efter en kriminalvÃ¥rdspÃ¥fÃ¶ljd i ingÃ¥ngshÃ¤ndelsen (tabell 881-882)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'mestIngripande', variables: ["S881", "S882"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		GrÃ¶vsta brott i ingÃ¥ngs- och Ã¥terfallshÃ¤ndelsen\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Antal och andel Ã¥terfall inom 3 Ã¥r, efter grÃ¶vsta brott i ingÃ¥ngs- och Ã¥terfallshÃ¤ndelsen (tabell 873)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'grovstaBrottPerson', variables: ["S873"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statxsubheadline">\r\n	Samtliga ingÃ¥ngshÃ¤ndelser\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Antal/andel Ã¥terfall inom tre Ã¥r\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga ingÃ¥ngshÃ¤ndelser: Antal och andel Ã¥terfall inom 1-3 Ã¥r (tabell 891-898)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'antal3arHandelse', variables: ["S891", "S892", "S893", "S894", "S895", "S896", "S897", "S898"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="Subheadlines">\r\n	<h2>Tabeller preliminÃ¤r statistik</h2>\r\n</div>\r\n<div class="statxsubheadline">\r\n	Samtliga personer\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Antal/andel Ã¥terfall inom ett Ã¥r\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Antal/andel Ãterfall inom 1 Ã¥r (tabell p811-p827)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'pAntalPerson', variables: ["p811", "p812", "p813", "p814", "p815", "p816", "p827"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Tid till Ã¥terfall\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Mediantid till fÃ¶rsta Ã¥terfall (tabell p833-p836)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'pTidPerson', variables: ["p833", "p834", "p835", "p836"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Antal Ã¥terfallshÃ¤ndelser\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Samtliga personer: Antal Ã¥terfallsbrott/lagfÃ¶ringar (tabell p851, p853)\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formAterfall', {prefix: 'pAntalHandelsePerson', variables: ["p851", "p853"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/anmaldaSlutlig',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="AnmaldaSlutligDiv">\r\n<div class="statselectorsection">\r\n<div class="modulexlinkxstatistics statisticheadline">\r\n	AnmÃ¤lda brott Ã¥rsvis (tabell 100)\r\n</div>\r\n<div class="modulexdatexstatistics statisticheadline">\r\n	Tabeller som visar Ã¥rlig statistik Ã¶ver	anmÃ¤lda brott inklusive brott per 100 000 invÃ¥nare, i hela landet samt i polisregionerna fr.o.m. 2015 och i lÃ¤nen t.o.m. 2014.\r\n</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_100, prefix: '100'}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="statselectorsection">\r\n<div class="modulexlinkxstatistics statisticheadline">\r\n	AnmÃ¤lda brott i regionerna (tabell 110)\r\n</div>\r\n<div class="modulexdatexstatistics statisticheadline">\r\n	Ãrlig statistik Ã¶ver anmÃ¤lda brott i polisregionerna fr.o.m. 2015 samt i lÃ¤nen t.o.m. 2014, samlat i en tabell per Ã¥r inklusive brott per 100 000 invÃ¥nare.\r\n</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_110, prefix: '110'}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="statselectorsection">\r\n<div class="modulexlinkxstatistics statisticheadline">\r\n	AnmÃ¤lda brott i kommunerna (tabell 120)\r\n</div>\r\n<div class="modulexdatexstatistics statisticheadline">\r\n	Tabeller som visar Ã¥rlig statistik Ã¶ver anmÃ¤lda brott inklusive brott per 100 000 invÃ¥nare, i kommunerna. (Fr.o.m. Ã¥r 2002.)\r\n</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_120, prefix: '120'}) ))==null?'':__t)+
'\r\n</div>\r\n</div>\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/uppklaradeSlutlig',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        Uppklarade brott efter brottstyp och typ av beslut\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar Ã¥rlig statistik Ã¶ver	uppklarade brott efter brottstyp, typ av beslut (t ex beslut om att vÃ¤cka Ã¥tal), personuppklaring och uppklaring. (Fr.o.m. Ã¥r 1995 och i lÃ¤nen fr.o.m. 1998.)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_170, prefix: '170', lanFromYear: '1998'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        Tekniskt uppklarade brott\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar Ã¥rlig statistik Ã¶ver tekniskt uppklarade brott dÃ¤r misstÃ¤nkt person inte finns, totalt och efter brottstyp samt efter beslut/nedlÃ¤ggningsbeslut. (Fr.o.m. Ã¥r 1995 och i lÃ¤nen fr.o.m. 1997.)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_150, prefix: '150', lanFromYear: '1997'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        Uppklarade brott som anmÃ¤lts under redovisningsÃ¥ret samt under tidigare Ã¥r\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar Ã¥rlig statistik Ã¶ver anmÃ¤lda brott och andel uppklarade brott som anmÃ¤lts dels under redovisningsÃ¥ret, dels under fÃ¶regÃ¥ende Ã¥r och efter brottstyp. (Fr.o.m. Ã¥r 1995 och i lÃ¤nen fr.o.m. 1996.)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_140, prefix: '140', lanFromYear: '1996'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        Brottsdeltaganden\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar Ã¥rlig statistik Ã¶ver antal brottsdeltaganden (antal brott per misstÃ¤nkt person), totalt samt efter brottstyp och beslut i Ã¥talsfrÃ¥gan. (Fr.o.m. Ã¥r 1995 och lÃ¤nen fr.o.m. 1997.)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_160, prefix: '160', lanFromYear: '1997'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formAterfall',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formAterfall" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n\r\n      <label class="availableToScreenReader" for="variabel_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj variabel</label>\r\n      <select id="variabel_'+
((__t=( prefix ))==null?'':__t)+
'" name="variabel" style="width: 210px">\r\n        <option value=\'-\'>VÃ¤lj variabel</option>\r\n        ';
 _.each(variables, function(variable) { 
__p+='\r\n        <option value="'+
((__t=( variable ))==null?'':_.escape(__t))+
'">'+
((__t=( tableInfo[variable].title ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      <label class="availableToScreenReader" for="population_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj population</label>\r\n      <select id="population_'+
((__t=( prefix ))==null?'':__t)+
'" name="population" disabled="disabled">\r\n        <option value="-">VÃ¤lj population</option>\r\n        <option value="all">Alla</option>\r\n        <option value="female">Kvinnor</option>\r\n        <option value="male">MÃ¤n</option>\r\n      </select>\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period" disabled="disabled">\r\n        <option value="-">VÃ¤lj period</option>\r\n      </select>\r\n\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/module/common/common',module:function(define){'use strict';define(function (require) {
    'use strict';
    let regionFrom2015 = "<option value='Rn01'>Region Nord</option><option value='Rn02'>Region Mitt</option><option value='Rn03'>Region Stockholm</option><option value='Rn04'>Region Ãst</option><option value='Rn05'>Region VÃ¤st</option><option value='Rn06'>Region Syd</option><option value='Rn07'>Region Bergslagen</option>";
    let regionOchLandFrom2015 = "<option value='La'>Hela landet</option>" + regionFrom2015;
    let endastLandet = "<option value='La'>Hela landet</option>";

    return {
        getOmradeList: function(year,lanFromYear) {
            if (lanFromYear > year + 1 ) {
                return endastLandet;
            }
            if (year > 2014) {
                 return regionOchLandFrom2015;
            } else if (year > 1997) {
                let lanListFrom1998 = "<option value='La'>Hela landet</option><option value='ln10'>Blekinge lÃ¤n</option><option value='ln20'>Dalarnas lÃ¤n</option><option value='ln09'>Gotlands lÃ¤n</option><option value='ln21'>GÃ¤vleborgs lÃ¤n</option><option value='ln13'>Hallands lÃ¤n</option><option value='ln23'>JÃ¤mtlands lÃ¤n</option><option value='ln06'>JÃ¶nkÃ¶pings lÃ¤n</option><option value='ln08'>Kalmar lÃ¤n</option><option value='ln07'>Kronobergs lÃ¤n</option><option value='ln25'>Norrbottens lÃ¤n</option><option value='ln12'>SkÃ¥ne lÃ¤n</option><option value='ln01'>Stockholms lÃ¤n</option><option value='ln04'>SÃ¶dermanlands lÃ¤n</option><option value='ln03'>Uppsala lÃ¤n</option><option value='ln17'>VÃ¤rmlands lÃ¤n</option><option value='ln24'>VÃ¤sterbottens lÃ¤n</option><option value='ln22'>VÃ¤sternorrlands lÃ¤n</option><option value='ln19'>VÃ¤stmanlands lÃ¤n</option><option value='ln14'>VÃ¤stra GÃ¶talands lÃ¤n</option><option value='ln18'>Ãrebro lÃ¤n</option><option value='ln05'>ÃstergÃ¶tlands lÃ¤n</option>";
                return lanListFrom1998;
            } else if (year == 1997) {
                let lanList1997 = "<option value='La'>Hela landet</option><option value='ln10'>Blekinge lÃ¤n</option><option value='ln20'>Dalarnas lÃ¤n</option><option value='ln09'>Gotlands lÃ¤n</option><option value='ln21'>GÃ¤vleborgs lÃ¤n</option><option value='ln14'>GÃ¶teborgs- och Bohus lÃ¤n</option><option value='ln13'>Hallands lÃ¤n</option><option value='ln23'>JÃ¤mtlands lÃ¤n</option><option value='ln06'>JÃ¶nkÃ¶pings lÃ¤n</option><option value='ln08'>Kalmar lÃ¤n</option><option value='ln07'>Kronobergs lÃ¤n</option><option value='ln25'>Norrbottens lÃ¤n</option><option value='ln16'>Skaraborgs lÃ¤n</option><option value='ln12'>SkÃ¥ne lÃ¤n</option><option value='ln01'>Stockholms lÃ¤n</option><option value='ln04'>SÃ¶dermanlands lÃ¤n</option><option value='ln03'>Uppsala lÃ¤n</option><option value='ln17'>VÃ¤rmlands lÃ¤n</option><option value='ln24'>VÃ¤sterbottens lÃ¤n</option><option value='ln22'>VÃ¤sternorrlands lÃ¤n</option><option value='ln19'>VÃ¤stmanlands lÃ¤n</option><option value='ln15'>Ãlvsborgs lÃ¤n</option><option value='ln18'>Ãrebro lÃ¤n</option><option value='ln05'>ÃstergÃ¶tlands lÃ¤n</option>";
                return lanList1997;
            } else {
                let lanListTom1996 = "<option value='La'>Hela landet</option><option value='ln10'>Blekinge lÃ¤n</option><option value='ln09'>Gotlands lÃ¤n</option><option value='ln21'>GÃ¤vleborgs lÃ¤n</option><option value='ln14'>GÃ¶teborgs- och Bohus lÃ¤n</option><option value='ln13'>Hallands lÃ¤n</option><option value='ln23'>JÃ¤mtlands lÃ¤n</option><option value='ln06'>JÃ¶nkÃ¶pings lÃ¤n</option><option value='ln08'>Kalmar lÃ¤n</option><option value='ln20'>Kopparbergs lÃ¤n</option><option value='ln11'>Kristianstads lÃ¤n</option><option value='ln07'>Kronobergs lÃ¤n</option><option value='ln12'>MalmÃ¶hus lÃ¤n</option><option value='ln25'>Norrbottens lÃ¤n</option><option value='ln16'>Skaraborgs lÃ¤n</option><option value='ln01'>Stockholms lÃ¤n</option><option value='ln04'>SÃ¶dermanlands lÃ¤n</option><option value='ln03'>Uppsala lÃ¤n</option><option value='ln17'>VÃ¤rmlands lÃ¤n</option><option value='ln24'>VÃ¤sterbottens lÃ¤n</option><option value='ln22'>VÃ¤sternorrlands lÃ¤n</option><option value='ln19'>VÃ¤stmanlands lÃ¤n</option><option value='ln15'>Ãlvsborgs lÃ¤n</option><option value='ln18'>Ãrebro lÃ¤n</option><option value='ln05'>ÃstergÃ¶tlands lÃ¤n</option>";
                return lanListTom1996;
            }
        },
        getRegionerOchLand: function() {
            return regionOchLandFrom2015;
        },
        getRegioner: function() {
            return regionFrom2015;
        },
        getEndastLandet: function() {
            return endastLandet;
        },
        getGenderList: function () {
            return [
                {id: 'all', text: 'Alla'},
                {id: 'female', text: 'Kvinnor'},
                {id: 'male', text: 'MÃ¤n'}
            ];
        }
    }
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formVariabelPeriod',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formPeriodPop" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n      <label class="availableToScreenReader" for="variabel_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj variabel</label>\r\n      <select id="variabel_'+
((__t=( prefix ))==null?'':__t)+
'" name="variabel" style="width: 210px">\r\n        <option value=\'-\'>VÃ¤lj variabel</option>\r\n        ';
 _.each(variables, function(variable) { 
__p+='\r\n        <option value="'+
((__t=( variable ))==null?'':_.escape(__t))+
'">'+
((__t=( tableInfo[variable].title ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      ';
 if (hidePeriod != true) { 
__p+='\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period" disabled="disabled">\r\n        <option value="-">VÃ¤lj period</option>\r\n      </select>\r\n      ';
 } 
__p+='\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/reportedOffences',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="ReportedOffencesDiv">\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics statisticheadline">\r\n			Total number of reported offences\r\n		</div>\r\n		<div class="modulexdatexstatistics statisticheadline">\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodEng', {perioder: perioder, prefix: 'Total_number_of_reported_offences', category: 'anmaldabrott'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n</div>\r\n\r\n<div>\r\n\r\n</div>\r\n<div>\r\n	'+
((__t=( reportedOffences1950 ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/kriminalvard',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="articlexintro">\r\n	HÃ¤kte\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Personer inskrivna i hÃ¤kte\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell55x', variables: ["551g","551"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<p />\r\n<p />\r\n<div class="articlexintro">\r\n	FÃ¤ngelse\r\n</div>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Personer med pÃ¥bÃ¶rjad fÃ¤ngelseverkstÃ¤llighet\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell55x', variables: ["553","554","555","556","557","558","559"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Personer med pÃ¥gÃ¥ende fÃ¤ngelseverkstÃ¤llighet 1 oktober\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell56x', variables: ["560","561","562"], tableInfo: tableInfo, hidePeriod: false}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Personer dÃ¶mda till fÃ¤ngelse som pÃ¥bÃ¶rjat respektive avslutat fÃ¤ngelseverkstÃ¤lligheter\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell55x', variables: ["552"], tableInfo: tableInfo, hidePeriod: false}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Planerade permissioner frÃ¥n anstalt\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell56x', variables: ["563"], tableInfo: tableInfo, hidePeriod: false}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Avvikelse frÃ¥n anstalt\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell56x', variables: ["564"], tableInfo: tableInfo, hidePeriod: false}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<p />\r\n<p />\r\n<div class="articlexintro">\r\n	FrivÃ¥rd\r\n</div>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Personer med pÃ¥bÃ¶rjad frivÃ¥rdsverkstÃ¤llighet\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell570_572b', variables: ["570","571","572","572b"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Personer med pÃ¥bÃ¶rjad frivÃ¥rdsinsats efter huvudbrott och Ã¥lder\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formVariabelPeriod', {prefix: 'tabell573_577', variables: ["573","574","575","576","577"], tableInfo: tableInfo}) ))==null?'':__t)+
'\r\n</div>\r\n<p />';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/anmaldaPrel',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="AnmaldaPrelDiv">\r\n<div class="statselectorsection">\r\n<div class="modulexlinkxstatistics statisticheadline">\r\n	AnmÃ¤lda brott mÃ¥nadsvis (tabell P1M)\r\n</div>\r\n<div class="modulexdatexstatistics statisticheadline">\r\n	Tabeller som visar preliminÃ¤r statistik Ã¶ver anmÃ¤lda brott mÃ¥nadsvis samt ackumulerat under innevarande Ã¥r och de senaste 12 mÃ¥naderna, i hela landet samt polisregioner. I tabellerna redovisas Ã¤ven fÃ¶rÃ¤ndringar jÃ¤mfÃ¶rt med motsvarande perioder fÃ¶regÃ¥ende Ã¥r i antal och procent samt brott per 100 000 invÃ¥nare.\r\n</div>\r\n\r\n<div class="modulexdatexstatistics statisticheadline">Per region</div>\r\n   <div class="selectorblock">\r\n\r\n	<form id="statform_P1" name="anmaldaPrel" class="statform" action="" method="get">\r\n      <div>\r\n		<input type="hidden" name="category" value="P1" />\r\n		<input type="hidden" name="prefix" value="P1" />\r\n		  <label class="availableToScreenReader" for="period_P1">VÃ¤lj period</label>\r\n		  <select id="period_P1" name="period">\r\n			  <option value="-">VÃ¤lj period</option>\r\n			  ';
 _.each(perioder_P1, function(period) { 
__p+='\r\n			  <option value="'+
((__t=( period.id ))==null?'':_.escape(__t))+
'">'+
((__t=( period.text ))==null?'':_.escape(__t))+
'</option>\r\n			  ';
 }) 
__p+='\r\n		  </select>\r\n		  	<label class="availableToScreenReader" for="region_P1">VÃ¤lj omrÃ¥de</label>\r\n			<select id="region_P1" name="region" disabled="disabled">\r\n				<option value=\'-\'>VÃ¤lj omrÃ¥de</option> '+
((__t=( regioner ))==null?'':__t)+
'\r\n			</select>\r\n		<input id="submit_P1" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n      </div>\r\n	</form>\r\n	<div id="statisticsdownload_P1" class="statisticsdownload" style="display: none;">\r\n      <div id="download_P1" class="download"></div>\r\n    </div>\r\n  </div>\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n<div class="modulexlinkxstatistics statisticheadline">\r\n	Utveckling per mÃ¥nad under innevarande Ã¥r (tabell P3)\r\n</div>\r\n<div class="modulexdatexstatistics statisticheadline">\r\n	Tabeller som visar preliminÃ¤r statistik Ã¶ver utvecklingen av anmÃ¤lda brott per mÃ¥nad under innevarande Ã¥r och ackumulerat, i hela landet samt polisregioner.\r\n</div>\r\n	<div class="selectorblock">\r\n		<form id="statform_P3" name="anmaldaPrel" class="statform" action="" method="get">\r\n			<div>\r\n				<input type="hidden" name="category" value="P3">\r\n				<input type="hidden" name="prefix" value="P3">\r\n				<input type="hidden" name="period" value="'+
((__t=( p3Period ))==null?'':__t)+
'">\r\n\r\n				<label class="availableToScreenReader" for="region_P3">VÃ¤lj omrÃ¥de</label>\r\n				<select id="region_P3" name="region">\r\n					<option value="-">VÃ¤lj omrÃ¥de</option>'+
((__t=( regioner ))==null?'':__t)+
'\r\n				</select>\r\n\r\n				<input id="submit_P3" class="buttonstyle searchxheadline" type="submit" value="Visa">\r\n			</div>\r\n\r\n		</form>\r\n		<div id="statisticsdownload_P3" class="statisticsdownload" style="display: none;">\r\n			<div id="download_P3" class="download"></div>\r\n		</div>\r\n	</div>\r\n</div>\r\n\r\n\r\n<div class="statselectorsection">\r\n<div class="modulexlinkxstatistics statisticheadline">\r\n	AnmÃ¤lda brott kvartalsvis (tabell P1Kv och P2)\r\n</div>\r\n<div class="modulexdatexstatistics statisticheadline">\r\n	Tabeller som visar preliminÃ¤r statistik Ã¶ver anmÃ¤lda brott kvartalsvis det senaste Ã¥ret, ackumulerat under innevarande Ã¥r, samt de senaste 4 kvartalen, i hela landet samt polisregioner. I tabellerna redovisas Ã¤ven fÃ¶rÃ¤ndringar jÃ¤mfÃ¶rt med motsvarande perioder fÃ¶regÃ¥ende Ã¥r i antal och procent samt brott per 100 000 invÃ¥nare.\r\n</div>\r\n	<div class="selectorblock">\r\n	<form id="statform_P2" name="anmaldaPrel" class="statform" action="" method="get">\r\n		<div>\r\n			<input type="hidden" name="category" value="P2">\r\n			<input type="hidden" name="prefix" value="P2">\r\n\r\n			<label class="availableToScreenReader" for="period_P2">VÃ¤lj period</label>\r\n			<select id="period_P2" name="period">\r\n				<option value="-">VÃ¤lj period</option>\r\n				';
 _.each(perioder_P2, function(period) { 
__p+='\r\n				<option value="'+
((__t=( period.id ))==null?'':_.escape(__t))+
'">'+
((__t=( period.text ))==null?'':_.escape(__t))+
'</option>\r\n				';
 }) 
__p+='\r\n			</select>\r\n\r\n			<label class="availableToScreenReader" for="region_P2">VÃ¤lj omrÃ¥de</label>\r\n			<select id="region_P2" name="region" disabled="disabled">\r\n				<option value="-">VÃ¤lj omrÃ¥de</option>\r\n				<option value="P1">Hela landet</option>\r\n				<option value="P2">Alla omrÃ¥den (i samma tabell)</option>\r\n			</select>\r\n\r\n			<input id="submit_P2" class="buttonstyle searchxheadline" type="submit" value="Visa">\r\n		</div>\r\n	</form>\r\n	<div id="statisticsdownload_P2" class="statisticsdownload" style="display: none;">\r\n		<div id="download_P2" class="download"></div>\r\n	</div>\r\n</div>\r\n</div>\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics statisticheadline">\r\n			Tidsserier â AnmÃ¤lda brott mÃ¥nadsvis\r\n		</div>\r\n		<div class="modulexdatexstatistics statisticheadline">\r\n			Tabeller som visar preliminÃ¤r statistik Ã¶ver anmÃ¤lda brott mÃ¥nadsvis samlat i tidsserier fÃ¶r respektive Ã¥r, i hela landet frÃ¥n 2015, samt i regionerna frÃ¥n 2022. Tidsserierna kan anvÃ¤ndas fÃ¶r att gÃ¶ra jÃ¤mfÃ¶relser med tidigare mÃ¥nader under ett Ã¥r samt med motsvarande mÃ¥nader under tidigare Ã¥r.\r\n		</div>\r\n		<form id="statform_P4" name="anmaldaPrel" class="statform" action="" method="get">\r\n			<div>\r\n				<input type="hidden" name="category" value="P4">\r\n				<input type="hidden" name="prefix" value="P4">\r\n\r\n				<label class="availableToScreenReader" for="period_P4">VÃ¤lj period</label>\r\n				<select id="period_P4" name="period">\r\n					<option value="-">VÃ¤lj period</option>\r\n					';
 _.each(perioder_P4, function(period) { 
__p+='\r\n					<option value="'+
((__t=( period.id ))==null?'':_.escape(__t))+
'">'+
((__t=( period.text ))==null?'':_.escape(__t))+
'</option>\r\n					';
 }) 
__p+='\r\n				</select>\r\n\r\n				<label class="availableToScreenReader" for="region_P4">VÃ¤lj omrÃ¥de</label>\r\n				<select id="region_P4" name="region" disabled="disabled">\r\n					<option value=\'-\'>VÃ¤lj omrÃ¥de</option> '+
((__t=( regioner ))==null?'':__t)+
'\r\n				</select>\r\n\r\n				<input id="submit_P4" class="buttonstyle searchxheadline" type="submit" value="Visa">\r\n			</div>\r\n		</form>\r\n		<div id="statisticsdownload_P4" class="statisticsdownload" style="display: none;">\r\n			<div id="download_P4" class="download"></div>\r\n		</div>\r\n	</div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formPeriodPopRegion',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formPeriodPopRegion" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="lanFromYear" value="'+
((__t=( lanFromYear ))==null?'':__t)+
'" />\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period">\r\n        <option value="-">VÃ¤lj period</option>\r\n        ';
 _.each(perioder, function(period) { 
__p+='\r\n        <option value="'+
((__t=( period ))==null?'':_.escape(__t))+
'">'+
((__t=( period ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      <label class="availableToScreenReader" for="population_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj population</label>\r\n      <select id="population_'+
((__t=( prefix ))==null?'':__t)+
'" name="population" disabled="disabled">\r\n        <option value=\'-\'>VÃ¤lj population</option>\r\n        ';
 _.each(populationer, function(population) { 
__p+='\r\n        <option value="'+
((__t=( population.id ))==null?'':_.escape(__t))+
'">'+
((__t=( population.text ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      <label class="availableToScreenReader" for="region_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj omrÃ¥de</label>\r\n      <select id="region_'+
((__t=( prefix ))==null?'':__t)+
'" name="region" disabled="disabled">\r\n        <option value=\'-\'>VÃ¤lj omrÃ¥de</option>\r\n      </select>\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/processedOffencesLinkedToASuspect',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="ProcessedOffencesLinkedToASuspectDiv">\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics statisticheadline">\r\n			Processed offences linked to a suspect\r\n		</div>\r\n		<div class="modulexdatexstatistics statisticheadline">\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodEng', {perioder: perioder, prefix: 'Processed_offences_linked_to_a_suspect', category: 'handlagdabrottsmisstankar'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n</div>\r\n\r\n<div>\r\n\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formPeriodPop1Pop2Region',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      template   = require('/template/component/formPeriodPop1Pop2Region'),
      common   = require('/module/common/common'),
      client   = require('/module/client/client');

   

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         let lanFromYear = options.lanFromYear;
         if (category === undefined) {
            category = options.prefix;
         }
         if (lanFromYear === undefined) {
            lanFromYear = "";
         }
         return _.extend({}, {perioder: options.perioder, populationer1: options.populationer1, populationer2: options.populationer2 ,
            pop1Title: options.pop1Title, pop2Title: options.pop2Title, prefix: options.prefix, category: category, lanFromYear: lanFromYear});
      },
      events: {
         dom: {
            'change [name=period_pp1p2r]': 'changePeriod_PeriodPopPop2Region',
            'change [name=population1]': 'changePopulation1_PeriodPopPop2Region',
            'change [name=population2]': 'changePopulation2_PeriodPopPop2Region',
            'submit form': 'handleSubmit_pp1p2r'
          },
      },
      changePeriod_PeriodPopPop2Region: function(e) {
         client.changeEnableNext(e, 'population1');
      },
      changePopulation1_PeriodPopPop2Region: function(e) {

         if (client.formvalue(e, 'population1') === 'all') {
            client.updateOptions(e, 'region', "<option value='0'>VÃ¤lj omrÃ¥de</option>" + common.getRegioner());
         } else {
            client.updateOptions(e, 'region',  common.getEndastLandet());
         }

         if (client.formvalue(e,'period_pp1p2r') < 2022) {
            e.target.form.elements.namedItem('population2').selectedIndex = 1;
            client.setDisableFormElement(e,'population2',true);
            this.changePopulation2_PeriodPopPop2Region(e);
         } else {
            client.changeEnableNext(e, 'population2');
         }

      },
      changePopulation2_PeriodPopPop2Region: function (e) {
            let pop1val = client.formvalue(e, 'population1');
            if (pop1val === '-') {
               client.setDisableFormElement(e, 'region', true);
            } else {
               client.changeEnableNext(e, 'region');
            }
        },
      handleSubmit_pp1p2r: function (e) {
         let formMap =  client.parseForm(e);
         let period = formMap.get('period_pp1p2r');
         let alder = formMap.get('population1');
         let kon = formMap.get('population2')
         let prefix = formMap.get('prefix');
         let region = formMap.get('region');
         let category = formMap.get('category');
         let divurl;

         if (alder !== 'all') {
            divurl = category + '/' + period + '/' + this.determineGenderValue(kon, prefix) + alder + region + '-' + period;
            //  eg.: 260/2022/261U1La-2022
            // eg. : 260/2022/260U1La-2022
         } else {
            divurl = category + '/' + period + '/' + this.determineGenderValue(kon, prefix) + prefix.substring(3) + region + '-' + period;
            // eg. : 260/2022/261aRn01-2022
            // eg. : 260/2022/260aRn01-2022
         }
         console.log("divurl= " + divurl);
         client.loadurlandshow(divurl, $(e.target));
      },
      determineGenderValue: function(kon, prefix) {
         if (kon === '-') {
            return '';
         }
         if (typeof kon != "undefined") {
            if (kon !== "all") {
               return (Number(parseInt(prefix) + ("female" === kon ? 1 : 2)).toString());
            } else if (kon === "all") {
               return (Number(parseInt(prefix)));
            }
         }
         return prefix;
      }
   });
});

}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/processedOffences',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="ProcessedOffencesDiv">\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics statisticheadline">\r\n			Processed offences\r\n		</div>\r\n		<div class="modulexdatexstatistics statisticheadline">\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodEng', {perioder: perioder, prefix: 'Processed_offences', category: 'HandlagdaBrott'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n</div>\r\n\r\n<div>\r\n\r\n</div>\r\n\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/misstanktaTidigare',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="MisstanktaTidigareDiv">\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			Personer misstÃ¤nkta fÃ¶r brott efter brottstyp och Ã¥lder\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Tabeller som visar Ã¥rlig statistik Ã¶ver personer misstÃ¤nkta fÃ¶r brott efter brottstyp och Ã¥lder vid brottet, i hela landet samt i polisregionerna fr.o.m. 2015 och i lÃ¤nen t.o.m. 2014. Tabeller med redovisning gÃ¤llande enbart kvinnor respektive mÃ¤n finns endast fÃ¶r hela landet. (Fr.o.m. Ã¥r 1995.)\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodPopRegion', {perioder: perioder_200, populationer: genderList, prefix: '200'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			Brottsdeltaganden efter brottstyp och Ã¥lder\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Tabeller som visar Ã¥rlig statistik Ã¶ver brottsdeltaganden (antal brott som varje misstÃ¤nkt person misstÃ¤nkts fÃ¶r), efter brottstyp och Ã¥lder vid brottet, samt i polisregionerna fr.o.m. 2015 och i lÃ¤nen t.o.m. 2014. Tabeller med redovisning gÃ¤llande enbart kvinnor respektive mÃ¤n finns endast fÃ¶r hela landet. (Fr.o.m. Ã¥r 1995.)\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodPopRegion', {perioder: perioder_210, populationer: genderList, prefix: '210'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			MisstÃ¤nkta personer efter antal brott, kÃ¶n och Ã¥lder\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Tabeller som visar Ã¥rlig statistik Ã¶ver personer misstÃ¤nkta fÃ¶r brott efter kÃ¶n, Ã¥lder och antal brott de misstÃ¤nkts fÃ¶r, i hela landet. (Fr.o.m. Ã¥r 1995.)\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_190, prefix: '190'}) ))==null?'':__t)+
'\r\n	</div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formHatbrott',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      template   = require('/template/component/formHatbrott'),
      client   = require('/module/client/client');


   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let showPeriod = false;

         if (options.showPeriod === true) {
            showPeriod = true;
         }
         return _.extend({}, {variables: options.variables, prefix: options.prefix, category: options.category, showPeriod: showPeriod})
      },
      events: {
         dom: {
            'change [id=period_anmalda-hatbrott-regional]': 'changePeriod_hatbrott',
            'submit form': 'handleHatbrottSubmit'
         },
      },
      changePeriod_hatbrott: function(e) {
         let target = $(e.target);
         let valdPeriod =target.val();
         let nextRegion = $(e.target.parentNode).find("select[name=region]");
         nextRegion.empty();
         nextRegion.append("<option value='0'>VÃ¤lj kategori</option>");

         switch(true){
            case (valdPeriod === "-") :
              nextRegion.append("<option value='0'>VÃ¤lj kategori</option>");
               nextRegion.attr("disabled", true);
               break;

            case (valdPeriod <= 2014):
               nextRegion.append("<option value='hatbrottsmotiv-efter-huvudbrott-och-lan-per-100-000-invanare.html'>Hatbrottsmotiv efter huvudbrott och lÃ¤n, per 100 000 invÃ¥nare</option>");
               nextRegion.append("<option value='hatbrottsmotiv-efter-lan-per-100-000-invanare.html'>Hatbrottsmotiv efter lÃ¤n, per 100 000 invÃ¥nare</option>");
               nextRegion.append("<option value='hatbrottsmotiv-efter-storstadskommuner-per-100-000-invanare.html'>Hatbrottsmotiv efter storstadskommuner, per 100 000 invÃ¥nare</option>");
               nextRegion.attr("disabled", false);
               break;
            case (valdPeriod > 2014):
               nextRegion.append("<option value='hatbrottsmotiv-efter-huvudbrott-och-region-per-100-000-invanare.html'>Hatbrottsmotiv efter huvudbrott och region, per 100 000 invÃ¥nare</option>");
               nextRegion.append("<option value='hatbrottsmotiv-efter-region-per-100-000-invanare.html'>Hatbrottsmotiv efter region, per 100 000 invÃ¥nare</option>");
               nextRegion.append("<option value='hatbrottsmotiv-efter-storstadskommuner-per-100-000-invanare.html'>Hatbrottsmotiv efter storstadskommuner, per 100 000 invÃ¥nare</option>");
               nextRegion.attr("disabled", false);
               break;
         }
      }
      ,
      handleHatbrottSubmit: function(e) {
         let form = $(e.target);

         let cat = form.find("[name='category']").val();
         let prefix = form.find("[name='prefix']").val();
         let period = form.find("[name='period']").val();
         let region = form.find("[name='region']").val();

         let divurl;
         region = region.replace('.html','');

         if (typeof period != "undefined") {
            divurl = cat + "/" + prefix + "/" + region + "/" +period + "/" + region;
         } else {
            divurl = cat + "/" + prefix + "/" + region;
         }

         client.loadurlandshow(divurl,form);
      }

   });
});


}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/handlagdaPrel',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        HalvÃ¥rsstatistik Ã¶ver handlagda brott efter om utredning har bedrivits eller ej och typ av beslut (tabell 301)\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar preliminÃ¤r halvÃ¥rsstatistik Ã¶ver handlagda brott efter om utredning har bedrivits eller om brotten har direktavskrivits, typ av beslut (t ex vÃ¤ckt Ã¥tal), lagfÃ¶ringsprocent och personuppklaringsprocent, och efter brottstyp. (Fr.o.m. halvÃ¥ret 2015)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_301, prefix: '301'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n    <div class="modulexlinkxstatistics">\r\n        HalvÃ¥rsstatistik Ã¶ver Handlagda brott efter om en misstÃ¤nkt person har varit registrerad fÃ¶r brotten eller ej och typ av beslut (tabell 311)\r\n    </div>\r\n    <div class="modulexdatexstatistics">\r\n        Tabeller som visar preliminÃ¤r halvÃ¥rsstatistik Ã¶ver handlagda brott efter om en misstÃ¤nkt person har varit registrerad fÃ¶r brotten eller ej, typ av beslut (t ex vÃ¤ckt Ã¥tal), och efter brottstyp. (Fr.o.m. halvÃ¥ret 2015)\r\n    </div>\r\n    '+
((__t=( renderer.renderComponent('formPeriodRegion', {perioder: perioder_311, prefix: '311'}) ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/statdownload',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div id="statisticsdownload_'+
((__t=( category ))==null?'':_.escape(__t))+
'" class="statisticsdownload" style="display: none;">\r\n  <div id="download_'+
((__t=( category ))==null?'':_.escape(__t))+
'" class="download"></div>\r\n</div>';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formPeriod',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formPeriod" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period">\r\n        <option value="-">VÃ¤lj period</option>\r\n        ';
 _.each(perioder, function(period) { 
__p+='\r\n        <option value="'+
((__t=( period ))==null?'':_.escape(__t))+
'">'+
((__t=( period ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formPeriodRegion',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      template   = require('/template/component/formPeriodRegion');

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         let lanFromYear = options.lanFromYear;
         if (category === undefined) {
            category = options.prefix;
         }
         if (lanFromYear === undefined) {
            lanFromYear = "";
         }
         return _.extend({}, {perioder: options.perioder, prefix: options.prefix, category: category, lanFromYear: lanFromYear});
      }
   });
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formPeriod',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      template   = require('/template/component/formPeriod');

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         if (category === undefined) {
            category = options.prefix;
         }
         return _.extend({}, {perioder: options.perioder, category: category, prefix: options.prefix})
      }
   });
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/misstankta',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div id="MisstanktaDiv">\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			MisstÃ¤nkta personer efter brottstyp, Ã¥lder och kÃ¶n (tabell 220-222)\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Statistiken finns fÃ¶r hela landet frÃ¥n och med 2007 och fÃ¶r regionerna frÃ¥n och med 2015.\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodPopRegion', {perioder: perioder_220, populationer: genderList, prefix: '220', lanFromYear: '2015'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			MisstÃ¤nkta personer med lagfÃ¶ringsbeslut, efter brottstyp och kÃ¶n. (tabell 230a)\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Statistiken finns fÃ¶r hela landet frÃ¥n och med 2007 och fÃ¶r regionerna frÃ¥n och med 2015.\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodPopRegion', {perioder: perioder_230, populationer: genderList, prefix: '230a', category: '230', lanFromYear: '2015'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			MisstÃ¤nkta personer med lagfÃ¶ringsbeslut, efter brottstyp, Ã¥lder och kÃ¶n. (tabell 230b och 231-232)\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Statistiken finns fÃ¶r hela landet frÃ¥n och med 2007 och fÃ¶r regionerna frÃ¥n och med 2015.\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodPopRegion', {perioder: perioder_230, populationer: genderList, prefix: '230b', category: '230', lanFromYear: '2015'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			MisstÃ¤nkta personer efter antal brott de misstÃ¤nks fÃ¶r under Ã¥ret, brottskategori och kÃ¶n. (tabell 240)\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Statistiken finns fÃ¶r hela landet frÃ¥n och med 2007\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_240, populationer: genderList, genderMap: genderMap, prefix: '240'}) ))==null?'':__t)+
'\r\n	</div>\r\n\r\n	<div class="statselectorsection">\r\n		<div class="modulexlinkxstatistics">\r\n			MisstÃ¤nkta personer efter antal brott de misstÃ¤nks fÃ¶r under Ã¥ret, Ã¥lder och kÃ¶n. (tabell 250)\r\n		</div>\r\n		<div class="modulexdatexstatistics">\r\n			Statistiken finns fÃ¶r hela landet frÃ¥n och med 2007\r\n		</div>\r\n		'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_250, prefix: '250'}) ))==null?'':__t)+
'\r\n	</div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formPeriodPopRegionLagforda',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      common = require('/module/common/common'),
      client_lagforda   = require('/module/client/client_lagforda'),
      template   = require('/template/component/formPeriodPopRegion');
   let genderMap;

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         let lanFromYear = options.lanFromYear;
         genderMap = options.genderMap;

         if (category === undefined) {
            category = options.prefix;
         }
         if (lanFromYear === undefined) {
            lanFromYear = "";
         }
         return _.extend({}, {perioder: options.perioder, populationer: options.populationer, prefix: options.prefix,
            category: category, lanFromYear: lanFromYear, genderMap: genderMap})
      },
      events: {
         dom: {
            'change [id=population_420]': 'changePopulation_PeriodPopRegionLagforda',
            'change [id=period_260]': 'changePeriod_PeriodPopRegion260',
            'change [id=period_420]': 'changePeriod_PeriodPopRegion420',
         },
      },
      changePopulation_PeriodPopRegionLagforda: function(e) {
         e.preventDefault();
         let target = $(e.target);
         let valdPopulation =target.val();
         let nextRegion = $(e.target.parentNode).find("select[name=region]");
         let valdPeriod = $(e.target.parentNode).find("select[name=period]");


         if (valdPopulation == "-") {
            nextRegion.attr("disabled", true);
         } else{
            if(valdPeriod.val() <= "2008" && valdPopulation != "all") {
               nextRegion.empty();
               nextRegion.append("<option value='La'>Hela landet</option>");
               nextRegion[0].selectedIndex = 0;
            }
            nextRegion.attr("disabled", false);
         }
         return false;
      },

      changePeriod_PeriodPopRegion420: function(e) {
         e.preventDefault();
         let target = $(e.target);
         let valdPeriod =target.val();
         let nextPop = $(e.target.parentNode).find("select[name=population]");
         let nextRegion = $(e.target.parentNode).find("select[name=region]");
         let category = $(e.target.parentNode).find("input[name=category]");

         nextPop.empty();
         nextRegion.empty();

         if(valdPeriod == "-") {
            nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>");
            nextPop.attr("disabled", true);
         } else{
            nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>", common.getOmradeList(valdPeriod,"2000"));
            nextPop.append("<option value='-'>VÃ¤lj population</option><option value='all'>Alla</option>", client_lagforda.getPopulationList(valdPeriod, category, genderMap));
            nextPop.attr("disabled", false);
         }
         return false;
      },
      changePeriod_PeriodPopRegion260: function(e) {
         let target = $(e.target);
         let valdPeriod =target.val();
         let nextPop = $(e.target.parentNode).find("select[name=population]");
         let nextRegion = $(e.target.parentNode).find("select[name=region]");
         let category = $(e.target.parentNode).find("input[name=category]");

         nextPop.empty();
         nextRegion.empty();

         if(valdPeriod == "-") {
            nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>");
            nextPop.attr("disabled", true);
         } else{
            nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>", common.getOmradeList(valdPeriod,"2000"));
            nextPop.append("<option value='-'>VÃ¤lj population</option><option value='all'>Alla</option>", client_lagforda.getPopulationList(valdPeriod, category, genderMap));
            nextPop.attr("disabled", false);
         }

      }
   });
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/hatbrottTidigare',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<script type="text/javascript">\r\n	//<![CDATA[\r\n	$svjq(document).ready(function() {\r\n\r\n	});\r\n	function showDialog(){\r\n\r\n		let opt = {\r\n			position: { my: \'center top \', at: \'center top+10\', of: window, collision: "none" },\r\n			closeOnEscape: true,\r\n			width: \'65%\',\r\n			modal: true,\r\n			dialogClass: \'htmlstat-dialog\',\r\n			fluid: true\r\n		};\r\n		$("#statistikVisare").dialog(opt);\r\n\r\n	}\r\n\r\n	// ]]>\r\n</script>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		AnmÃ¤lda hatbrott\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Redovisningen utgÃ¥r frÃ¥n huvudbrottet i anmÃ¤lan (brottet med strÃ¤ngast straffskala) som har bedÃ¶mts vara ett hatbrott av BrÃ¥. Fler tabeller och diagram fÃ¶r respektive motiv finns i Ã¥rsboken fÃ¶r hatbrottsstatistiken.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formHatbrott', {variables: variables_anmalda_hatbrott, prefix: 'anmalda-hatbrott', category: 'hatbrott'}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		AnmÃ¤lda hatbrott regional\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Redovisningen utgÃ¥r frÃ¥n huvudbrottet i anmÃ¤lan (brottet med strÃ¤ngast straffskala) som har bedÃ¶mts vara ett hatbrott av BrÃ¥.\r\n		Vid Ã¥rsskiftet 2015 upphÃ¶rde 21 lÃ¤nspolismyndigheter fÃ¶r att istÃ¤llet bli en enda Polismyndighet indelad i sju regioner.\r\n		Statistiken redovisas dÃ¤rfÃ¶r uppdelat pÃ¥ lÃ¤n till och med 2014 och pÃ¥ polisregion frÃ¥n och med 2015.\r\n		Fler tabeller och diagram fÃ¶r respektive motiv finns i Ã¥rsboken fÃ¶r hatbrottsstatistiken.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formHatbrott', {variables: variables_anmalda_hatbrott_regional, prefix: 'anmalda-hatbrott-regional', category: 'hatbrott', showPeriod: true}) ))==null?'':__t)+
'\r\n</div>\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Utsatthet fÃ¶r hatbrott\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formHatbrott', {variables: variables_region_utsatthet_for_hatbrott, prefix: 'utsatthet-for-hatbrott', category: 'hatbrott'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Handlagda hatbrott\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formHatbrott', {variables: variables_handlagda_hatbrott, prefix: 'handlagda-hatbrott', category: 'hatbrott'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/engelska/thePrisonAndProbationService',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div>\r\n	'+
((__t=( byPrincipalOffence ))==null?'':__t)+
'<p>\r\n	'+
((__t=( byLengthSentence ))==null?'':__t)+
'<p>\r\n	'+
((__t=( byAge ))==null?'':__t)+
'\r\n</div>\r\n\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/component/formPeriodPopRegion',module:function(define){'use strict';define(function(require) {
   'use strict';

   var
      _          = require('underscore'),
      Component  = require('Component'),
      template   = require('/template/component/formPeriodPopRegion');

   return Component.extend({

      template: template,
      filterState: function(state, options) {
         let category = options.category;
         let lanFromYear = options.lanFromYear;
         if (category === undefined) {
            category = options.prefix;
         }
         if (lanFromYear === undefined) {
            lanFromYear = "";
         }
         return _.extend({}, {perioder: options.perioder, populationer: options.populationer, prefix: options.prefix, category: category, lanFromYear: lanFromYear});
      }

   });
});
}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/component/formPeriodPop',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="selectorblock">\r\n\r\n  <form id="statform_'+
((__t=( prefix ))==null?'':__t)+
'" name="formPeriodPop" class="statform" action="" method="get">\r\n    <div>\r\n      <input type="hidden" name="category" value="'+
((__t=( category ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="prefix" value="'+
((__t=( prefix ))==null?'':__t)+
'" />\r\n      <input type="hidden" name="lanFromYear" value="'+
((__t=( lanFromYear ))==null?'':__t)+
'" />\r\n      <label class="availableToScreenReader" for="period_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj period</label>\r\n      <select id="period_'+
((__t=( prefix ))==null?'':__t)+
'" name="period">\r\n        <option value="-">VÃ¤lj period</option>\r\n        ';
 _.each(perioder, function(period) { 
__p+='\r\n        <option value="'+
((__t=( period ))==null?'':_.escape(__t))+
'">'+
((__t=( period ))==null?'':_.escape(__t))+
'</option>\r\n        ';
 }) 
__p+='\r\n      </select>\r\n      <label class="availableToScreenReader" for="population_'+
((__t=( prefix ))==null?'':__t)+
'">VÃ¤lj population</label>\r\n      <select id="population_'+
((__t=( prefix ))==null?'':__t)+
'" name="population" disabled="disabled">\r\n        <option value=\'-\'>VÃ¤lj population</option>\r\n      </select>\r\n      <input id="submit_'+
((__t=( prefix ))==null?'':__t)+
'" class="buttonstyle searchxheadline" type="submit" value="Visa" />\r\n    </div>\r\n  </form>\r\n  <div id="statisticsdownload_'+
((__t=( prefix ))==null?'':__t)+
'" class="statisticsdownload" style="display: none;">\r\n    <div id="download_'+
((__t=( prefix ))==null?'':__t)+
'" class="download"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/template/narkotika',module:function(define){define(function(require){var _=require('underscore');return function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='ï»¿<div class="articlexintro">\r\n	Samtliga lagfÃ¶ringsbeslut avseende narkotikabrott. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		LagfÃ¶ringsbeslut dÃ¤r narkotikabrott ingÃ¥r efter lÃ¤n, beslutstyp och Ã¥talsunderlÃ¥telseskÃ¤l\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_600, prefix: '610', category: '600'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	Samtliga godkÃ¤nda straffÃ¶relÃ¤gganden och domslut. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		GodkÃ¤nda straffÃ¶relÃ¤gganden och domslut dÃ¤r narkotikabrott ingÃ¥r, efter typ av preparat och Ã¥lder\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller fÃ¶r alla respektive kvinnor finns frÃ¥n Ã¥r 1998. Tabeller fÃ¶r mÃ¤n finns frÃ¥n Ã¥r 2003.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_600, population: genderList,prefix: '624', category: '600', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		GodkÃ¤nda straffÃ¶relÃ¤gganden och domslut dÃ¤r narkotikabrott ingÃ¥r, efter Ã¥lder och typ av gÃ¤rning\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller fÃ¶r alla respektive kvinnor finns frÃ¥n Ã¥r 1998. Tabeller fÃ¶r mÃ¤n finns frÃ¥n Ã¥r 2003.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_600, population: genderList,prefix: '626', category: '600', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		GodkÃ¤nda straffÃ¶relÃ¤gganden och domslut dÃ¤r narkotikabrott ingÃ¥r, efter typ av preparat och region\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Redovisning av varje kombination av preparat i alla lagfÃ¶ringar dÃ¤r narkotikabrott ingÃ¥r\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_600, prefix: '623', category: '600'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	Samtliga domslut avseende narkotikabrott. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut dÃ¤r huvudbrottet Ã¤r narkotikabrott, efter typ av gÃ¤rning och huvudpÃ¥fÃ¶ljd\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller fÃ¶r alla respektive kvinnor finns frÃ¥n Ã¥r 1998. Tabeller fÃ¶r mÃ¤n finns frÃ¥n Ã¥r 2009.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriodPop', {perioder: perioder_600, population: genderList,prefix: '630', category: '600', genderMap: genderMap}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Domslut med pÃ¥fÃ¶ljden fÃ¤ngelse dÃ¤r huvudbrottet Ã¤r narkotikabrott, efter typ av gÃ¤rning och fÃ¤ngelsetidens lÃ¤ngd i mÃ¥nader\r\n	</div>\r\n	<div class="modulexdatexstatistics">\r\n		Tabeller finns fram till Ã¥r 2006.\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_632, prefix: '632', category: '600'}) ))==null?'':__t)+
'\r\n</div>\r\n\r\n<div class="articlexintro">\r\n	Unika narkotikapreparat i lagfÃ¶ringsbeslut. Ãrsvis\r\n</div>\r\n\r\n<div class="statselectorsection">\r\n	<div class="modulexlinkxstatistics">\r\n		Redovisning av varje unikt preparat i alla lagfÃ¶ringar dÃ¤r narkotikabrott ingÃ¥r\r\n	</div>\r\n	'+
((__t=( renderer.renderComponent('formPeriod', {perioder: perioder_600, prefix: '628', category: '600'}) ))==null?'':__t)+
'\r\n</div>\r\n';
}
return __p;
};});}});
AppRegistry.registerModule({applicationId:'StatSelector|2.2.16',path:'/main',module:function(define){'use strict';define(function(require) {
   'use strict';

   const
      _          = require('underscore'),
      Component  = require('Component'),
      common = require('/module/common/common'),
      client = require('/module/client/client');


   return Component.extend({

      getTemplate: function() {
            return require('/template/' + this.state.stattyp);
      },
      events: {
         dom: {
            'change [name=period]': 'periodChange',
            'change [name=population]': 'populationChange',
            'submit form': 'handleSubmit'
         },
      },
      periodChange: function(e) {

         switch ($(e.target.parentNode.parentNode).attr('name')) {
            case 'formPeriodRegion':
               changePeriod_OmradeList(e);
               break;
            case 'formPeriodPopRegion':
               changePeriod_PeriodPopRegion(e);
               break;
            case 'anmaldaPrel':
               changePeriodAnmaldaPrel(e);
               break;
         }
      },
      populationChange: function(e) {
         switch (e.target.id) {
            case 'population_200':
            case 'population_210':
            case 'population_220':
            case 'population_230a':
            case 'population_230b':
            case 'population_260':
               changePopulation_PeriodPopRegionMisstankta(e);
               break;
            default:
               changePopulation_PeriodPopRegion(e);
         }
      },

      handleSubmit: function(e) {
         e.preventDefault();
         let form = $(e.target);
         switch (form.attr('name')) {
            case 'formPeriodRegion':
               submitformPeriodRegion(form);
               break;
            case 'formPeriodPopRegion':
               submitformPeriodPopRegion(form);
               break;
            case 'anmaldaPrel':
               submitAnmaldaPrel(form);
               break;
            case 'formPeriod':
               submitformPeriod(form);
               break;
         }
      },
   });

   function submitformPeriod(form) {
      let cat = form.find("[name='category']").val();
      let prefix = form.find("[name='prefix']").val();
      let period = form.find("[name='period']").val();
      let divurl;
      if (cat == 'malsagare') {
         divurl = cat + "/" + period + "/" + 'malsagare_vid_brottsanmalan_' + period;
      } else if (cat == 'HR' || cat == 'GT') {
         divurl = cat + "/" + period + "/" + prefix + '-' + period;
      } else if (cat == 'utsattaomraden') {
         if(prefix === "Tabell1"){
            divurl = cat + "/" + prefix + "/" + prefix + "_" + period;
         } else {
            divurl = cat + "/" + prefix + "/" + period + "/" + prefix + "_" + period;
         }
      }  else {
         divurl = cat + "/" + period + "/" + prefix + 'La-' + period;
      }
      client.loadurlandshow(divurl,form);
   }

   function submitformPeriodRegion(form) {
      let cat = form.find("[name='category']").val();
      let prefix = form.find("[name='prefix']").val();
      let region = form.find("[name='region']").val();
      let period = form.find("[name='period']").val();

      if (typeof region == "undefined") {
         region = "la";
      }
      let divurl = cat + "/" + period + "/" + prefix + region + "-" + period;
      client.loadurlandshow(divurl,form);
   }

   function submitformPeriodPopRegion(form) {
      let cat = form.find("[name='category']").val();
      let prefix = form.find("[name='prefix']").val();
      let population = form.find("[name='population']").val();
      let region = form.find("[name='region']").val();
      let period = form.find("[name='period']").val();
      let divurl;
      if (typeof region == "undefined") {
         region = "la";
      }

      switch(prefix) {
         case "230a":
            prefix = client.parseGenderValue(population,prefix,region);
            divurl = cat + "/" + period + "/" + prefix + region + "-" + period;
            break;
         case "230b":
            prefix = client.parseGenderValue(population,prefix,region);
            divurl = cat + "/" + period + "/" + prefix + region + "-" + period;
            break;
         case "260a":
            if(population !== 'all') {
               prefix = '260';
            }
            divurl = cat + "/" + period + "/" + prefix;
            if (typeof population != "undefined" && population !== 'all') {
               divurl += population + region + "-" + period;
            } else {
               divurl += region + "-" + period;
            }
            break;
         case "220":
            if (region != "La") {
               region = "a" + region;
            }
          //220 ska fortsÃ¤tta dÃ¤rfÃ¶r inget break
         case "200":
         case "210":
         case "260":
         case "420":
            prefix = client.parseGenderValue(population,prefix,region);
            divurl = cat + "/" + period + "/" + prefix + region + "-" + period;
            break;
      }
      client.loadurlandshow(divurl,form);
   }

   function changePeriod_OmradeList(e) {
      let target = $(e.target);
      let valdPeriod =target.val();
      let lanFromYear = $(e.target.parentNode).find("input[name=lanFromYear]").val();
      let nextRegion = $(e.target.parentNode).find("select[name=region]");
      nextRegion.empty();
      if(valdPeriod == "-") {
         nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>");
         nextRegion.attr("disabled", true);
      } else{
         nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>", common.getOmradeList(valdPeriod,lanFromYear));
         nextRegion.attr("disabled", false);
      }

      if(target.attr('id') === "period_120") {
         nextRegion.find("option[value='La']").remove();
      }
   }

   function changePeriod_PeriodPopRegion(e) {
      let target = $(e.target);
      let valdPeriod =target.val();
      let nextPop = $(e.target.parentNode).find("select[name=population]");
      let nextRegion = $(e.target.parentNode).find("select[name=region]");
      nextRegion.empty();
      if (!nextPop.disabled) {
         nextPop[0].selectedIndex = 0;
      }
      if(valdPeriod == "-") {
         nextPop.attr("disabled", true);
      } else{
         if (e.target.id === 'period_230a') {
            let lanFromYear = $(e.target.parentNode).find("input[name='lanFromYear']").val();
            if ( valdPeriod < 2022) {
               nextPop[0].selectedIndex = 1;
               nextPop.attr("disabled", true);
            } else {
               nextPop.attr("disabled", false);
            }
               nextRegion.attr("disabled", false);
               nextRegion.empty();
               nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>").append(common.getOmradeList(valdPeriod, lanFromYear));
         } else {
            nextPop.attr("disabled", false);
         }

      }
   }

   function changePopulation_PeriodPopRegion(e) {
      let target = $(e.target);
      let valdPopulation = target.val();
      let nextRegion = $(e.target.parentNode).find("select[name=region]");

      if (nextRegion !== undefined) {
         nextRegion.empty();
         if(valdPopulation == "all") {
            nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>").append(common.getRegioner());
            nextRegion.attr("disabled", false);
         } else if(valdPopulation == "-"){
            nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>");
            nextRegion[0].selectedIndex = 0;
            nextRegion.attr("disabled", true);
         } else {
            nextRegion.append(common.getEndastLandet());
            if (nextRegion.length > 0) {
               nextRegion[0].selectedIndex = 0;
               nextRegion.attr("disabled", true);
            }
         }

      }
   }

   function changePopulation_PeriodPopRegionMisstankta(e) {
      let target = $(e.target);
      let form = target.closest("form");
      let prefix = form.find("[name='prefix']").val();
      let lanFromYear = form.find("[name='lanFromYear']").val();
      let valdPopulation =target.val();
      let valdPeriod = $(e.target.parentNode).find("select[name=period]").val();
      let nextRegion = $(e.target.parentNode).find("select[name=region]");

      if(valdPopulation == "-" ){
         nextRegion.empty().append("<option value='0'>VÃ¤lj omrÃ¥de</option>");
         nextRegion[0].selectedIndex = 0;
         nextRegion.attr("disabled", true);
      } else {
         let endastHelaLandet = false;

         if ((prefix == '230a' || prefix == '220')  && valdPopulation != 'all' && valdPeriod < 2022){
            endastHelaLandet = true;
         }

         if (endastHelaLandet) {
            nextRegion.empty().append(common.getEndastLandet());
            nextRegion[0].selectedIndex = 0;
            nextRegion.attr("disabled", true);
         } else {
            nextRegion.empty();
            nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>").append(common.getOmradeList(valdPeriod, lanFromYear));
            nextRegion.attr("disabled", false);
         }
      }
   }

   function submitAnmaldaPrel(form) {
      client.submitFormAnmaldaPrel(form);
   }

   function changePeriodAnmaldaPrel(e) {
      let valdPeriod = $(e.target).val();
      let nextRegion = $(e.target).closest("select").next().next();
      let target = $(e.target);
      let form = target.closest("form");
      let prefix = form.find("[name='prefix']").val();

      let match = valdPeriod.match(/\d{4}/);
      let p4GreaterThan2021 = false;
      if (match) {
         let year = parseInt(match[0]);
         if (year > 2021) {
            p4GreaterThan2021 = true;
         }
      }

      if(valdPeriod === "-") {
         nextRegion.empty();
         nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>");
         nextRegion[0].selectedIndex = 0;
         nextRegion.attr("disabled", true);
      } else if(prefix === 'P4' && p4GreaterThan2021) {
         nextRegion.empty();
         nextRegion.append("<option value='0'>VÃ¤lj omrÃ¥de</option>");
         nextRegion.append(common.getRegionerOchLand());
         nextRegion.attr("disabled", false);
      } else if (prefix === 'P4'){
         nextRegion.empty();
         nextRegion.append(common.getEndastLandet());
         nextRegion[0].selectedIndex = 0;
         nextRegion.attr("disabled", true);
      } else {
         nextRegion.attr("disabled", false);
      }
   }

});
}});