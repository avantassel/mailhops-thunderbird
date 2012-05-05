/*
* @author: Andrew Van Tassel
* @email: andrew@andrewvantassel.com
* @website: http://mailhops.com
* @TODO: cache result and display country flag in column
*/

var mailHops =
{
  resultBox:				null,
  resultText:				null,
  resultDetails:			null,
  container:				null,
  mapLink:					null,
  mailhopsDataPaneSPF:		null,
  mailhopsDataPaneDKIM:		null,
  mailhopsDataPaneMailer:	null,
  mailhopsDataPaneDNSBL:	null,
  isLoaded:     			false,
  options:					{'map':'goog','unit':'mi','api_url':'http://api.mailhops.com'},
  appVersion:				'MailHops Thunderbird 0.7'
}

mailHops.startLoading = function()
{
  //load preferences
  mailHops.loadPref();
  
  mailHops.isLoaded = true;
  mailHops.container = document.getElementById ( "mailhopsBox" ) ;
  mailHops.resultBox = document.getElementById ( "mailhopsResult" ) ;
  mailHops.resultText = document.getElementById ( "mailhopsResultText" ) ;
  mailHops.resultDetails = document.getElementById ( "mailhopsDataPaneDetails");
  mailHops.mapLink = document.getElementById ( "mailhopsMapLink");
  //auth
  mailHops.mailhopsDataPaneSPF = document.getElementById ( "mailhopsDataPaneSPF");   
  mailHops.mailhopsDataPaneDKIM = document.getElementById ( "mailhopsDataPaneDKIM");    
  mailHops.mailhopsDataPaneMailer = document.getElementById ( "mailhopsDataPaneMailer");    
  mailHops.mailhopsDataPaneDNSBL = document.getElementById ( "mailhopsDataPaneDNSBL");      
  
   mailHops.mapLink.addEventListener("click", function () { 
  		if(this.hasAttribute("data-route"))
	  		mailHops.launchMap(String(this.getAttribute("data-route"))); 
  	}
  , false); 
    
  //event listner for route click to launch map
  mailHops.mailhopsDataPaneDNSBL.addEventListener("click", function () { 
  		if(this.hasAttribute('data-ip'))
  			mailHops.launchSpamHausURL( this.getAttribute('data-ip'));
  	}
  , false);  
};

mailHops.loadPref = function()
{
  //get preferences
  mailHops.options.map = mailHops.getCharPref('mail.mailHops.map','goog');
  mailHops.options.unit = mailHops.getCharPref('mail.mailHops.unit','mi');
  mailHops.options.show_dkim = mailHops.getCharPref('mail.mailHops.show_dkim','true')=='true'?true:false;
  mailHops.options.show_spf = mailHops.getCharPref('mail.mailHops.show_spf','true')=='true'?true:false;
  mailHops.options.show_mailer = mailHops.getCharPref('mail.mailHops.show_mailer','true')=='true'?true:false;
  mailHops.options.show_dnsbl = mailHops.getCharPref('mail.mailHops.show_dnsbl','true')=='true'?true:false;
  //Hosting
  mailHops.options.use_private = mailHops.getCharPref('mail.mailHops.use_private','false')=='true'?true:false;
  mailHops.options.hosting = mailHops.getCharPref('mail.mailHops.hosting','personal');
  
  if(mailHops.options.use_private)
  	mailHops.options.api_url = mailHops.getCharPref('mail.mailHops.api_url','http://api.mailhops.com');    
  else
  	mailHops.options.api_url='http://api.mailhops.com';
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
  var headReceived = mailHops.headers.extractHeader( "Received" , true );
  var headXOrigIP = mailHops.headers.extractHeader( "X-Originating-IP" , false );
  
  var headXMailer = mailHops.options.show_mailer ? mailHops.headers.extractHeader( "X-Mailer" , false ):null ;
  var headUserAgent = mailHops.options.show_mailer ? mailHops.headers.extractHeader( "User-Agent" , false ):null ;
  var headXMimeOLE = mailHops.options.show_mailer ? mailHops.headers.extractHeader( "X-MimeOLE" , false ):null ;
  var headReceivedSPF = mailHops.options.show_spf ? mailHops.headers.extractHeader( "Received-SPF" , false ):null ;
  var headAuth = mailHops.headers.extractHeader( "Authentication-Results" , false );
  
  //display auth
  mailHops.displayResultAuth(headXMailer,headUserAgent,headXMimeOLE,headAuth,headReceivedSPF);
    
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
	      			if(regexIp.test(received_ips[r]) && mailHops.testIP(received_ips[r],rline)){
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

mailHops.displayResultAuth = function( header_xmailer, header_useragent, header_xmimeole, header_auth, header_spf ){

	//SPF
	if(header_spf){
		header_spf=header_spf.replace(/^\s+/,"");
		var headerSPFArr=header_spf.split(' ');
		mailHops.mailhopsDataPaneSPF.setAttribute('value','SPF: '+headerSPFArr[0]);
		mailHops.mailhopsDataPaneSPF.style.backgroundImage = 'url(chrome://mailhops/content/images/auth/'+headerSPFArr[0]+'.png)';
		mailHops.mailhopsDataPaneSPF.setAttribute('tooltiptext',header_spf+'\n'+mailHops.authExplainSPF(headerSPFArr[0]));   
		mailHops.mailhopsDataPaneSPF.style.display='block';
	}
	else{
		mailHops.mailhopsDataPaneSPF.style.display='none';
	}
	//Authentication-Results
	//http://tools.ietf.org/html/rfc5451
	if(header_auth){
		var headerAuthArr=header_auth.split(';');
		var dkim_result;
		var spf_result;
		for(var h=0;h<headerAuthArr.length;h++){
			if(headerAuthArr[h].indexOf('dkim=')!=-1){
				dkim_result = headerAuthArr[h];
				if(header_spf)
					break;				
			}
			if(!header_spf && headerAuthArr[h].indexOf('spf=')!=-1){
				spf_result = headerAuthArr[h];
				if(dkim_result)
					break;				
			}
		}		
		if(mailHops.options.show_dkim && dkim_result){
			dkim_result=dkim_result.replace(/^\s+/,"");
			var dkimArr=dkim_result.split(' ');
			mailHops.mailhopsDataPaneDKIM.setAttribute('value','DKIM: '+dkimArr[0].replace('dkim=',''));
			mailHops.mailhopsDataPaneDKIM.style.backgroundImage = 'url(chrome://mailhops/content/images/auth/'+dkimArr[0].replace('dkim=','')+'.png)';
			mailHops.mailhopsDataPaneDKIM.setAttribute('tooltiptext',dkim_result+'\n'+mailHops.authExplainDKIM(dkimArr[0].replace('dkim=','')));   
			mailHops.mailhopsDataPaneDKIM.style.display='block';
		}
		else{
			mailHops.mailhopsDataPaneDKIM.style.display='none';
		}
		if(mailHops.options.show_spf && spf_result){
			spf_result=spf_result.replace(/^\s+/,"");
			var spfArr=spf_result.split(' ');
			mailHops.mailhopsDataPaneSPF.setAttribute('value','SPF: '+spfArr[0].replace('spf=',''));
			mailHops.mailhopsDataPaneSPF.style.backgroundImage = 'url(chrome://mailhops/content/images/auth/'+spfArr[0].replace('spf=','')+'.png)';
			mailHops.mailhopsDataPaneSPF.setAttribute('tooltiptext',spf_result+'\n'+mailHops.authExplainSPF(spfArr[0].replace('spf=','')));   
			mailHops.mailhopsDataPaneSPF.style.display='block';
		}
	}
	else{
		mailHops.mailhopsDataPaneDKIM.style.display='none';
	}
	//X-Mailer, User-Agent or X-MimeOLE
	if(header_xmailer){
		mailHops.mailhopsDataPaneMailer.style.backgroundImage = 'url(chrome://mailhops/content/images/email.png)';
		if(header_xmailer.indexOf('(')!=-1)
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_xmailer.substring(0,header_xmailer.indexOf('(')));
		else if(header_xmailer.indexOf('[')!=-1)
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_xmailer.substring(0,header_xmailer.indexOf('[')));
		else
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_xmailer);
		mailHops.mailhopsDataPaneMailer.setAttribute('tooltiptext',header_xmailer);   
		mailHops.mailhopsDataPaneMailer.style.display='block';
	} else if(header_useragent){
		mailHops.mailhopsDataPaneMailer.style.backgroundImage = 'url(chrome://mailhops/content/images/email.png)';
		if(header_useragent.indexOf('(')!=-1)
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_useragent.substring(0,header_useragent.indexOf('(')));
		else if(header_useragent.indexOf('[')!=-1)
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_useragent.substring(0,header_useragent.indexOf('[')));
		else
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_useragent);		
		mailHops.mailhopsDataPaneMailer.setAttribute('tooltiptext',header_useragent); 
		mailHops.mailhopsDataPaneMailer.style.display='block';
	}
	else if(header_xmimeole){
		mailHops.mailhopsDataPaneMailer.style.backgroundImage = 'url(chrome://mailhops/content/images/email.png)';
		
		if(header_xmimeole.indexOf('(')!=-1)
			header_xmimeole = header_xmimeole.substring(0,header_xmimeole.indexOf('('));
		else if(header_xmimeole.indexOf('[')!=-1)
			header_xmimeole = header_xmimeole.substring(0,header_xmimeole.indexOf('['));
		
		if(header_xmimeole.indexOf('Produced By ')!=-1)
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_xmimeole.replace('Produced By ',''));		
		else
			mailHops.mailhopsDataPaneMailer.setAttribute('value',header_xmimeole);		
		
		mailHops.mailhopsDataPaneMailer.setAttribute('tooltiptext',header_xmimeole); 
		mailHops.mailhopsDataPaneMailer.style.display='block';
	}	
	else {
		mailHops.mailhopsDataPaneMailer.style.display='none';
	}

};

mailHops.authExplainDKIM = function(result){

switch(result){

   case 'none':
   		return 'The message was not signed.';

   case 'pass':  
   		return 'The message was signed, the signature or signatures were acceptable to the verifier, and the signature(s) passed verification tests.';

   case 'fail':  
   case 'hardfail': 
   		return 'The message was signed and the signature or signatures were acceptable to the verifier, but they failed the verification test(s).';

   case 'policy':  
   		return 'The message was signed but the signature or signatures were not acceptable to the verifier.';

   case 'neutral':  
   		return 'The message was signed but the signature or signatures contained syntax errors or were not otherwise able to be processed.  This result SHOULD also be used for other failures not covered elsewhere in this list.';

   case 'temperror':  
   		return 'The message could not be verified due to some error that is likely transient in nature, such as a temporary inability to retrieve a public key.  A later attempt may produce a final result.';

   case 'permerror':  
   		return 'The message could not be verified due to some error that is unrecoverable, such as a required header field being absent.  A later attempt is unlikely to produce a final result.';
      
     default:
     	return '';
   }
      
};

mailHops.authExplainSPF = function(result){

switch(result){

   case 'none':
		return 'No policy records were published at the sender\'s DNS domain.';

   case 'neutral':  
   		return 'The sender\'s ADMD has asserted that it cannot or does not want to assert whether or not the sending IP address is authorized to send mail using the sender\'s DNS domain.';

   case 'pass':  
   		return 'The client is authorized by the sender\'s ADMD to inject or relay mail on behalf of the sender\'s DNS domain.';

   case 'policy':  
   		return 'The client is authorized to inject or relay mail on behalf of the sender\'s DNS domain according to the authentication method\'s algorithm, but local policy dictates that the result is unacceptable.'

   case 'hardfail':  
   		return 'This client is explicitly not authorized to inject or relay mail using the sender\'s DNS domain.';

   case 'softfail':  
   		return 'The sender\'s ADMD believes the client was not authorized to inject or relay mail using the sender\'s DNS domain, but is unwilling to make a strong assertion to that effect.';

   case 'temperror':  
   		return 'The message could not be verified due to some error that is likely transient in nature, such as a temporary inability to retrieve a policy record from DNS.  A later attempt may produce a final result.';

   case 'permerror':  
   		return 'The message could not be verified due to some error that is unrecoverable, such as a required header field being absent or a syntax error in a retrieved DNS TXT record.  A later attempt is unlikely to produce a final result.';
      
    default:
     	return '';
   }
      
};

mailHops.authExplainDNSBL = function(result){

	switch(result){

   		case '127.0.0.2':
   		case '127.0.0.3':
			return 'Static UBE sources, verified spam services and ROKSO spammers.';
		
		case '127.0.0.4':
		case '127.0.0.5':
		case '127.0.0.6':
		case '127.0.0.7':
			return 'Illegal 3rd party exploits, including proxies, worms and trojan exploits.';
		
		case '127.0.0.10':
		case '127.0.0.11':
			return 'IP ranges which should not be delivering unauthenticated SMTP email.';
			
		default:
			return '';
	}
};

mailHops.authExplainDNSBL_server = function(result){

	switch(result){

   		case '127.0.0.2':
   		case '127.0.0.3':
			return 'SBL';
		
		case '127.0.0.4':
		case '127.0.0.5':
		case '127.0.0.6':
		case '127.0.0.7':
			return 'XBL';
		
		case '127.0.0.10':
		case '127.0.0.11':
			return 'PBL';
			
		default:
			return '';
	}
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
	   		
	   		//auth & dnsbl
			if(!response.route[i].private && response.route[i].dnsbl && response.route[i].dnsbl.listed){
				mailHops.mailhopsDataPaneDNSBL.setAttribute('value','Blacklisted '+mailHops.authExplainDNSBL_server(response.route[i].dnsbl.record));
				mailHops.mailhopsDataPaneDNSBL.setAttribute('data-ip',response.route[i].ip);
				if(response.route[i].dnsbl.record)
					mailHops.mailhopsDataPaneDNSBL.setAttribute('tooltiptext','Click for more details.\n'+mailHops.authExplainDNSBL(response.route[i].dnsbl.record));
				else
					mailHops.mailhopsDataPaneDNSBL.setAttribute('tooltiptext','Click for more details.');
				mailHops.mailhopsDataPaneDNSBL.style.backgroundImage = 'url(chrome://mailhops/content/images/auth/bomb.png)';
				mailHops.mailhopsDataPaneDNSBL.style.display = 'block';
			}
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
    	if(mailHops.options.unit=='mi')
			distanceText =' ( '+mailHops.addCommas(Math.round(response.distance.miles))+' mi traveled )';
		else
			distanceText =' ( '+mailHops.addCommas(Math.round(response.distance.kilometers))+' km traveled )';
	}
	else if(displayText=='')
		displayText = ' Local message.';	
  } 
    	   	
 	if(header_route)
  		mailHops.mapLink.setAttribute("data-route", header_route);  	
  	else
		mailHops.mapLink.removeAttribute("data-route");  	
	
	mailHops.resultText.setAttribute('value', displayText+' '+distanceText);
  	mailHops.resultText.style.backgroundImage = 'url('+image+')';
  
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
	  	mailHops.resultText.style.backgroundImage = 'url(chrome://mailhops/content/images/info.png)';
	  else
	  	mailHops.resultText.style.backgroundImage = 'url(chrome://mailhops/content/images/auth/error.png)';
	  
	  if(data && data.error){
	  	mailHops.resultText.setAttribute('value', mailHops.getErrorTitle(data.meta.code));	  
	  	mailHops.resultText.setAttribute('tooltiptext',data.error.message); 
	  }else{
	  	mailHops.resultText.setAttribute('value', ' Service Unavailable.');	  
	  	mailHops.resultText.setAttribute('tooltiptext',' Could not connect to MailHops.'); 
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
	
	mailHops.mailhopsDataPaneDNSBL.style.display = 'none';
	
	mailHops.resultText.style.backgroundImage='url(chrome://mailhops/content/images/loader.gif)';
	mailHops.resultText.setAttribute('value',' Looking Up Route'); 
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
  if ( aTopic == "nsPref:changed" )
    mailHops.loadPref();
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
 
 xmlhttp.open("GET", mailHops.options.api_url+'/v1/lookup/?tb&app='+mailHops.appVersion+'&r='+String(header_route),true);
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
	messenger.launchExternalURL(encodeURIComponent('http://www.mailhops.com/whois/'+ip));
};
mailHops.launchSpamHausURL = function(ip){
	var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
	messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
	messenger.launchExternalURL(encodeURIComponent('http://www.spamhaus.org/query/bl?ip='+ip));
};
mailHops.launchMap = function(route){
	//launch mailhops api map
	var lookupURL=mailHops.options.api_url+'/v1/map/?pb&app='+mailHops.appVersion+'&m='+mailHops.options.map+'&u='+mailHops.options.unit+'&r='+String(route);
	 if(mailHops.options.show_weather)
	 	lookupURL+='&w=1';
	var openwin = window.openDialog(encodeURIComponent(lookupURL),"MailHops",'toolbar=no,location=no,directories=no,menubar=yes,scrollbars=yes,close=yes,width=732,height=332');
	openwin.focus();
};

addEventListener ( "messagepane-loaded" , mailHops.setupEventListener , true ) ;
