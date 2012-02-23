/*
* @author: Andrew Van Tassel
* @email: andrew@andrewvantassel.com
* @website: http://mailhops.com
* @TODO: cache result and display country flag in column
*/

var mailHops =
{
  resultBox:		null,
  resultImage:		null,
  resultText:		null,
  resultDetails:	null,
  container:		null,
  isLoaded:     	false,
  map:				'goog',
  unit:				'mi',
  appVersion:		'MailHops Thunderbird 0.6.2'
}

mailHops.startLoading = function()
{
  mailHops.isLoaded = true;
  mailHops.container = document.getElementById ( "mailhopsBox" ) ;
  mailHops.resultBox = document.getElementById ( "mailhopsResult" ) ;
  mailHops.resultImage = document.getElementById ( "mailhopsResultImage" ) ;  
  mailHops.resultText = document.getElementById ( "mailhopsResultText" ) ;
  mailHops.resultDetails = document.getElementById ( "mailhopsDataPaneDetails");
  
  //get preferences
  mailHops.map = mailHops.getCharPref('mail.mailHops.map','goog');
  mailHops.unit = mailHops.getCharPref('mail.mailHops.unit','mi');
  //event listner for route click to launch map
  mailHops.resultImage.addEventListener("click", function () { 
  		var route = this.getAttribute("data-route");
  		if(route)
	  		mailHops.launchMap(String(route)); 
  	}
  , false);  
};

mailHops.StreamListener =
{
  content: "" ,
  found: false ,
  onDataAvailable: function ( request , context , inputStream , offset , count )
  {
    try
    {
      var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance ( Components.interfaces.nsIScriptableInputStream ) ;
      sis.init ( inputStream ) ;

      if ( ! this.found )
      {
        this.content += sis.read ( count ) ;
        this.content = this.content.replace ( /\r/g , "" ) ;
        var pos = this.content.indexOf ( "\n\n" ) ;

        if ( pos > -1 )
        {
          // last header line must end with LF -> pos+1 !!!
          this.content = this.content.substr ( 0 , pos + 1 ) ;
          this.found = true ;
        }
      }
    }
    catch ( ex ) { }
  } ,
  onStartRequest: function ( request , context )
  {
    this.content = "" ;
    this.found = false ;
  } ,
  onStopRequest: function ( aRequest , aContext , aStatusCode )
  {
    mailHops.headers = Components.classes["@mozilla.org/messenger/mimeheaders;1"].createInstance ( Components.interfaces.nsIMimeHeaders ) ;
    mailHops.headers.initialize ( this.content , this.content.length ) ;
    mailHops.dispRoute() ;
  }
};

/**
*	loop through the header, find out if we have received-from headers
*/
mailHops.loadHeaderData = function()
{
  var msgURI = null ;

  if ( gDBView )
  {
    msgURI = gDBView.URIForFirstSelectedMessage ;
  }

  if ( msgURI == null )
  {
    return ;
  }

  var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance ( Components.interfaces.nsIMessenger ) ;
  var msgService = messenger.messageServiceFromURI ( msgURI ) ;
  msgService.CopyMessage ( msgURI , mailHops.StreamListener , false , null , msgWindow , {} ) ;
};

mailHops.dispRoute = function()
{
  //IP regex
var regexIp=/(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)\.(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)\.(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)\.(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)(\/(?:[012]\d?|3[012]?|[456789])){0,1}$/; 
var regexAllIp = /(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)\.(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)\.(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)\.(1\d{0,2}|2(?:[0-4]\d{0,1}|[6789]|5[0-5]?)?|[3-9]\d?|0)(\/(?:[012]\d?|3[012]?|[456789])){0,1}/g;
  var headReceived = mailHops.headers.extractHeader ( "Received" , true ) ;
  var headXOrigIP = mailHops.headers.extractHeader ( "X-Originating-IP" , false ) ;
  var received_ips;
  var all_ips = new Array();
  var rline='';
  
  //loop through the received headers and parse for IP addresses	
  if ( headReceived ){
  	var headReceivedArr = headReceived.split('\n');
  	if(headReceivedArr.length != 0){
    	for ( var h=0; h<headReceivedArr.length; h++ ) {
    		//build the received line by concat until semi-colon ; date/time
    		rline += headReceivedArr[h];
    		if(headReceivedArr[h].indexOf(';')==-1)    			
    			continue;
    		received_ips = rline.match(regexAllIp);	
	      	//maybe multiple IPs in one Received: line	
	      	if(received_ips != null && received_ips.length !=0){
	      		for( var r=0; r<received_ips.length; r++ ){	      			
	      			//only look at the first IP
	      			if(regexIp.test(received_ips[r]) && all_ips.indexOf(received_ips[r])==-1 && mailHops.testIP(received_ips[r],rline)){
						all_ips.unshift( received_ips[r] );
						break;		    	    
		    	}
		   	}
	      }
	      //reset the line
	      rline='';
      }
    } 
  }
  //get the originating IP address
	if(headXOrigIP){
		var ip = headXOrigIP.match(regexAllIp);
		if(ip != null && ip.length != 0 && all_ips.indexOf(ip[0])==-1)
			all_ips.unshift( ip[0] );
	}
  if ( all_ips.length != 0 ){
   mailHops.lookup ( all_ips ) ;
  } else {
	  mailHops.displayResult();
  }
};
//another ip check, dates will throw off the regex
mailHops.testIP = function(ip,header){
	var retval=true;
	try
	{
		var firstchar = header.substring(header.indexOf(ip)-1);
			firstchar = firstchar.substring(0,1);	
		var lastchar = header.substring((header.indexOf(ip)+ip.length));
			lastchar = lastchar.substring(0,1);
		
		if(firstchar.match(/\.|\d|\-/))
			retval = null;		
		else if(lastchar.match(/\.|\d|\-/))
			retval = null;
					
		if(header.indexOf('['+ip+']') != -1)
			retval = true;
		else if(header.indexOf('('+ip+')') != -1)
			retval = true;		
	}
	catch(ex) {
		retval = true;
	}	
	return retval;	
};

mailHops.displayResult = function ( header_route, response ){
  var displayText='';
  var distanceText='';
  var image='chrome://mailhops/content/images/local.png';
  var city;
  var state;
  var countryName;
  var gotFirst=false;

  //remove child details
	while(mailHops.resultDetails.firstChild) {
    	mailHops.resultDetails.removeChild(mailHops.resultDetails.firstChild);
	}

  if(response){
  	
   		for(var i=0; i<response.route.length;i++){
  			//get the first hop location
	   		if(!gotFirst && !response.route[i].private && !response.route[i].client){
	   			if(response.route[i].countryCode)
		   			image='chrome://mailhops/content/images/flags/'+response.route[i].countryCode.toLowerCase()+'.png';
		   		if(response.route[i].city)
		   			city=response.route[i].city;
		   		if(response.route[i].state)
		   			state=response.route[i].state;
		   		if(response.route[i].countryName)
		   			countryName=response.route[i].countryName;
	   			gotFirst=true;
	   		}
	   		
	   		var menuitem = document.createElement('menuitem');
	   		var label='';
	   		
	   		menuitem.setAttribute('class','menuitem-iconic');
	   		
	   		if(response.route[i].countryCode)
		   		menuitem.setAttribute('image','chrome://mailhops/content/images/flags/'+response.route[i].countryCode.toLowerCase()+'.png');
		   	else
		   		menuitem.setAttribute('image','chrome://mailhops/content/images/local.png');
		   	
		   	if(response.route[i].city && response.route[i].state){
			   	label='Hop #'+(i+1)+' '+response.route[i].city+', '+response.route[i].state;
			   	menuitem.setAttribute('oncommand','mailHops.launchWhoIs("'+response.route[i].ip+'");');
			   	menuitem.setAttribute('tooltiptext','Click for WhoIs');
			}
			else if(response.route[i].countryName){
				label='Hop #'+(i+1)+' '+response.route[i].countryName;
				menuitem.setAttribute('oncommand','mailHops.launchWhoIs("'+response.route[i].ip+'");');
				menuitem.setAttribute('tooltiptext','Click for WhoIs');
			}
			else 
				label='Hop #'+(i+1)+' Private';	
			
			label+=' '+response.route[i].ip;
			
			if(response.route[i].host)
			   	label+=' '+response.route[i].host;
			if(response.route[i].whois && response.route[i].whois.descr)
			   	label+=' '+response.route[i].whois.descr;
			if(response.route[i].whois && response.route[i].whois.netname)
			   	label+=' '+response.route[i].whois.netname;
			   	
			menuitem.setAttribute('label',label);
			
			//append details
	   		mailHops.resultDetails.appendChild(menuitem);
	   		
	   		}
 		}
 		
  if(image.indexOf('local')!=-1) {
  	displayText = ' Local message.';
  }				
  else {
  	if(city && state)
		displayText = city+', '+state;
	else if(countryName)
  		displayText = countryName;
    if(response.distance && response.distance.miles > 0){
    	if(mailHops.unit=='mi')
			distanceText =' ( '+mailHops.addCommas(Math.round(response.distance.miles))+' mi traveled )';
		else
			distanceText =' ( '+mailHops.addCommas(Math.round(response.distance.kilometers))+' km traveled )';
	}
	else if(displayText=='')
		displayText = ' Local message.';	
  } 
    	   	
  if(header_route)  	
  	mailHops.resultImage.setAttribute("data-route", header_route);
  else
	mailHops.resultImage.removeAttribute("data-route");

  mailHops.resultText.textContent = displayText+' '+distanceText;
  mailHops.resultImage.src=image;		
    
};

mailHops.ShowDetails = function(){
	if(mailHops.resultDetails.parent().style.display == 'block')
		mailHops.resultDetails.parent().style.display = 'block';
	else
		mailHops.resultDetails.parent().style.display = 'none';
};
	 
mailHops.displayError = function(data){
	  mailHops.container.removeAttribute("route");
	  if(data && data.meta.code==410)
	  	mailHops.resultImage.src = 'url(chrome://mailhops/content/images/info.png)';
	  else
	  	mailHops.resultImage.src = 'url(chrome://mailhops/content/images/auth/error.png)';
	  
	  if(data && data.error){
	  	mailHops.resultText.textContent = mailHops.getErrorTitle(data.meta.code);	  
	  	mailHops.resultImage.setAttribute('tooltiptext',data.error.message); 
	  }else{
	  	mailHops.resultText.textContent = ' Service Unavailable.';	  
	  	mailHops.resultImage.setAttribute('tooltiptext',' Could not connect to MailHops.'); 
	  }
};

mailHops.getErrorTitle = function(error_code){
	switch(error_code){
   		case 400:
   			return 'Missing route parameter';
   		case 410:
   			return 'Down for Maintenance';
   		case 500:
   			return 'Server Error';
   		default:
   			return 'Service Unavailable';
   	}
};
 		
mailHops.clearRoute = function(){
	mailHops.resultImage.src='chrome://mailhops/content/images/loader.gif';
	mailHops.resultText.textContent = ' Looking Up Route'; 
};

mailHops.setupEventListener = function()
{
  if ( mailHops.isLoaded ){
    return ;
  }

  mailHops.startLoading() ;
  mailHops.registerObserver() ;
 
  var listener = {} ;
  listener.onStartHeaders = function() { mailHops.clearRoute() ; } ;
  listener.onEndHeaders = mailHops.loadHeaderData ;
  gMessageListeners.push ( listener ) ;
};

//preferences observers
mailHops.registerObserver = function()
{
  var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService ( Components.interfaces.nsIPrefService ) ;
  mailHops._branch = prefService.getBranch ( "mail.mailHops." ) ;
  mailHops._branch.QueryInterface ( Components.interfaces.nsIPrefBranchInternal ) ;
  mailHops._branch.addObserver ( "" , mailHops , false ) ;
};

mailHops.unregisterObserver = function()
{
  if ( !mailHops._branch ){
    return ;
  }

  mailHops._branch.removeObserver ( "" , mailHops ) ;
};

mailHops.observe = function ( aSubject , aTopic , aData )
{
  if ( aTopic != "nsPref:changed" ){
    return ;
  }

  mailHops.startLoading();
};

mailHops.getCharPref = function ( strName , strDefault )
{
  var value;

  try
  {
    value = pref.getCharPref ( strName ) ;
  }
  catch ( exception )
  {
    value = strDefault ;
  }

  return ( value ) ;
};

//mailhops lookup
mailHops.lookup = function(header_route){

 //setup loading
 mailHops.clearRoute();
  
 //import nativeJSON 
 var nativeJSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);
 //call mailhops api for lookup	
 var xmlhttp = new XMLHttpRequest();
 
 xmlhttp.open("GET", 'http://api.mailhops.com/v1/lookup/?tb&app='+mailHops.appVersion+'&r='+String(header_route),true);
 xmlhttp.onreadystatechange=function() {
  if (xmlhttp.readyState==4) {
  try{
  	   var data = JSON.parse(xmlhttp.responseText);
	   if(data && data.meta.code==200){
	   		//display the result
	   		mailHops.displayResult(header_route,data.response);
	   } else {
	    	//display the error
	   		mailHops.displayError(data);
	   }
   }
   catch (e){ 

	   mailHops.displayError();
   }
  }
 };
 xmlhttp.send(null);

};

mailHops.addCommas = function(nStr)
{
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
};
mailHops.launchWhoIs = function(ip){
	var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
	messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
	messenger.launchExternalURL('http://www.mailhops.com/whois/'+ip);
};
mailHops.launchMap = function(route)
{
	//launch mailhops api map
	var openwin = window.openDialog('http://api.mailhops.com/v1/map/?tb&app='+mailHops.appVersion+'&m='+mailHops.map+'&u='+mailHops.unit+'&r='+route,"MailHops",'toolbar=no,location=no,directories=no,menubar=yes,scrollbars=yes,close=yes,width=732,height=332');
	openwin.focus();
};

addEventListener ( "messagepane-loaded" , mailHops.setupEventListener , true ) ;
