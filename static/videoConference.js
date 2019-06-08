var browserFakeUserAgent = 'Fake/5.0 (FakeOS) AppleWebKit/123 (KHTML, like Gecko) Fake/12.3.4567.89 Fake/123.45';
var navigator = window.navigator;

if (typeof navigator !== 'undefined') {
    if (typeof navigator.webkitGetUserMedia !== 'undefined') {
        navigator.getUserMedia = navigator.webkitGetUserMedia;
    }

    if (typeof navigator.mozGetUserMedia !== 'undefined') {
        navigator.getUserMedia = navigator.mozGetUserMedia;
    }
} else {
    navigator = {
        getUserMedia: function() {},
        userAgent: browserFakeUserAgent
    };
}

var isMobileDevice = !!(/Android|webOS|iPhone|iPad|iPod|BB10|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(navigator.userAgent || ''));
var isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob);
var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1 && ('netscape' in window) && / rv:/.test(navigator.userAgent);
var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
var isChrome = !!window.chrome && !isOpera;
var isIE = typeof document !== 'undefined' && !!document.documentMode && !isEdge;

function getBrowserInfo() {
    var nVer = navigator.appVersion;
    var nAgt = navigator.userAgent;
    var browserName = navigator.appName;
    var fullVersion = '' + parseFloat(navigator.appVersion);
    var majorVersion = parseInt(navigator.appVersion, 10);
    var nameOffset, verOffset, ix;

    // In Opera, the true version is after 'Opera' or after 'Version'
    if (isOpera) {
        browserName = 'Opera';
        try {
            fullVersion = navigator.userAgent.split('OPR/')[1].split(' ')[0];
            majorVersion = fullVersion.split('.')[0];
        } catch (e) {
            fullVersion = '0.0.0.0';
            majorVersion = 0;
        }
    }
    // In MSIE version <=10, the true version is after 'MSIE' in userAgent
    // In IE 11, look for the string after 'rv:'
    else if (isIE) {
        verOffset = nAgt.indexOf('rv:');
        if (verOffset > 0) { //IE 11
            fullVersion = nAgt.substring(verOffset + 3);
        } else { //IE 10 or earlier
            verOffset = nAgt.indexOf('MSIE');
            fullVersion = nAgt.substring(verOffset + 5);
        }
        browserName = 'IE';
    }
    // In Chrome, the true version is after 'Chrome'
    else if (isChrome) {
        verOffset = nAgt.indexOf('Chrome');
        browserName = 'Chrome';
        fullVersion = nAgt.substring(verOffset + 7);
    }
    // In Safari, the true version is after 'Safari' or after 'Version'
    else if (isSafari) {
        // both and safri and chrome has same userAgent
        if (nAgt.indexOf('CriOS') !== -1) {
            verOffset = nAgt.indexOf('CriOS');
            browserName = 'Chrome';
            fullVersion = nAgt.substring(verOffset + 6);
        } else if (nAgt.indexOf('FxiOS') !== -1) {
            verOffset = nAgt.indexOf('FxiOS');
            browserName = 'Firefox';
            fullVersion = nAgt.substring(verOffset + 6);
        } else {
            verOffset = nAgt.indexOf('Safari');

            browserName = 'Safari';
            fullVersion = nAgt.substring(verOffset + 7);

            if ((verOffset = nAgt.indexOf('Version')) !== -1) {
                fullVersion = nAgt.substring(verOffset + 8);
            }

            if (navigator.userAgent.indexOf('Version/') !== -1) {
                fullVersion = navigator.userAgent.split('Version/')[1].split(' ')[0];
            }
        }
    }
    // In Firefox, the true version is after 'Firefox'
    else if (isFirefox) {
        verOffset = nAgt.indexOf('Firefox');
        browserName = 'Firefox';
        fullVersion = nAgt.substring(verOffset + 8);
    }

    // In most other browsers, 'name/version' is at the end of userAgent
    else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
        browserName = nAgt.substring(nameOffset, verOffset);
        fullVersion = nAgt.substring(verOffset + 1);

        if (browserName.toLowerCase() === browserName.toUpperCase()) {
            browserName = navigator.appName;
        }
    }

    if (isEdge) {
        browserName = 'Edge';
        fullVersion = navigator.userAgent.split('Edge/')[1];
        // fullVersion = parseInt(navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)[2], 10).toString();
    }

    // trim the fullVersion string at semicolon/space/bracket if present
    if ((ix = fullVersion.search(/[; \)]/)) !== -1) {
        fullVersion = fullVersion.substring(0, ix);
    }

    majorVersion = parseInt('' + fullVersion, 10);

    if (isNaN(majorVersion)) {
        fullVersion = '' + parseFloat(navigator.appVersion);
        majorVersion = parseInt(navigator.appVersion, 10);
    }

    return {
        fullVersion: fullVersion,
        version: majorVersion,
        name: browserName,
        isPrivateBrowsing: false
    };
}

function detectDesktopOS() {
    var unknown = '-';

    var nVer = navigator.appVersion;
    var nAgt = navigator.userAgent;

    var os = unknown;
    var clientStrings = [{
        s: 'Chrome OS',
        r: /CrOS/
    }, {
        s: 'Windows 10',
        r: /(Windows 10.0|Windows NT 10.0)/
    }, {
        s: 'Windows 8.1',
        r: /(Windows 8.1|Windows NT 6.3)/
    }, {
        s: 'Windows 8',
        r: /(Windows 8|Windows NT 6.2)/
    }, {
        s: 'Windows 7',
        r: /(Windows 7|Windows NT 6.1)/
    }, {
        s: 'Windows Vista',
        r: /Windows NT 6.0/
    }, {
        s: 'Windows Server 2003',
        r: /Windows NT 5.2/
    }, {
        s: 'Windows XP',
        r: /(Windows NT 5.1|Windows XP)/
    }, {
        s: 'Windows 2000',
        r: /(Windows NT 5.0|Windows 2000)/
    }, {
        s: 'Windows ME',
        r: /(Win 9x 4.90|Windows ME)/
    }, {
        s: 'Windows 98',
        r: /(Windows 98|Win98)/
    }, {
        s: 'Windows 95',
        r: /(Windows 95|Win95|Windows_95)/
    }, {
        s: 'Windows NT 4.0',
        r: /(Windows NT 4.0|WinNT4.0|WinNT|Windows NT)/
    }, {
        s: 'Windows CE',
        r: /Windows CE/
    }, {
        s: 'Windows 3.11',
        r: /Win16/
    }, {
        s: 'Android',
        r: /Android/
    }, {
        s: 'Open BSD',
        r: /OpenBSD/
    }, {
        s: 'Sun OS',
        r: /SunOS/
    }, {
        s: 'Linux',
        r: /(Linux|X11)/
    }, {
        s: 'iOS',
        r: /(iPhone|iPad|iPod)/
    }, {
        s: 'Mac OS X',
        r: /Mac OS X/
    }, {
        s: 'Mac OS',
        r: /(MacPPC|MacIntel|Mac_PowerPC|Macintosh)/
    }, {
        s: 'QNX',
        r: /QNX/
    }, {
        s: 'UNIX',
        r: /UNIX/
    }, {
        s: 'BeOS',
        r: /BeOS/
    }, {
        s: 'OS/2',
        r: /OS\/2/
    }, {
        s: 'Search Bot',
        r: /(nuhk|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask Jeeves\/Teoma|ia_archiver)/
    }];
    for (var i = 0, cs; cs = clientStrings[i]; i++) {
        if (cs.r.test(nAgt)) {
            os = cs.s;
            break;
        }
    }

    var osVersion = unknown;

    if (/Windows/.test(os)) {
        if (/Windows (.*)/.test(os)) {
            osVersion = /Windows (.*)/.exec(os)[1];
        }
        os = 'Windows';
    }

    switch (os) {
        case 'Mac OS X':
            if (/Mac OS X (10[\.\_\d]+)/.test(nAgt)) {
                osVersion = /Mac OS X (10[\.\_\d]+)/.exec(nAgt)[1];
            }
            break;
        case 'Android':
            if (/Android ([\.\_\d]+)/.test(nAgt)) {
                osVersion = /Android ([\.\_\d]+)/.exec(nAgt)[1];
            }
            break;
        case 'iOS':
            if (/OS (\d+)_(\d+)_?(\d+)?/.test(nAgt)) {
                osVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(nVer);
                osVersion = osVersion[1] + '.' + osVersion[2] + '.' + (osVersion[3] | 0);
            }
            break;
    }

    return {
        osName: os,
        osVersion: osVersion
    };
}


console.log(getBrowserInfo());
console.log(detectDesktopOS());