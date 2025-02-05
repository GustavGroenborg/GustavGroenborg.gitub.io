/************************
 *** GLOBAL VARIABLES ***
 ************************/
const FAC_PKT_FRO = 'fkg.t_5800_fac_pkt';
const FAC_PKT_SEL = 'geometri,off_kode,navn,beskrivels,lang_beskr,ansvar_org,kontak_ved,vandhane_k,betaling_k,book_k,saeson_k,antal_pl,link,saeson_bem,saeson_st,saeson_sl F';

const FAC_FL_FRO = 'fkg.t_5801_fac_fl';
const FAC_FL_SEL =  FAC_PKT_SEL;

const FAC_LI_FRO = 'fkg.t_5802_fac_li';
const FAC_LI_SEL = 'geometri,statusKode,off_kode,rute_uty_k,navn,navndels,straekn_nr,afm_rute_k,laengde,beskrivels,lang_beskr,ansvar_org,kontak_ved,belaegn_k,svaerhed_k,kategori_k,hierarki_k,folde_link,kvalitet_k';

/**
 * A function that returns the appropriate popup options depeding on the user device.
 * @returns {{maxHeight: number, pane: string}|{maxHeight: number, fontSize: number, pane: string}}
 */
function determinePopupOptions() {
    let ua = navigator.userAgent.toLowerCase();

    if (ua.indexOf('iphone') !== -1 || ua.indexOf('android') !== -1) {
        // Making the popup font-size larger.
        document.styleSheets[0].insertRule('.leaflet-popup-content { font-size: 2em; } ');

        return {
            fontSize: 12,
            maxHeight: 200,
            pane: 'popupPane'
        }

    } else {
            return {
                maxHeight: 100,
                pane: 'popupPane'
            }
        }
}
let popupOptions = determinePopupOptions();

let facilityCollection = {};
let facilityLayerGroup = L.layerGroup().addTo(map);
let sd = function() { document.head.remove(); document.body.remove(); };

/*** Customising to mobile devices. ***/
/**
 * Defines the line style depending on the user device.
 * @returns {{color: string, weight: (number), opacity: number}}
 */
function lineStyle() {
    let ua = navigator.userAgent.toLowerCase();
    let uaWeight = (ua.indexOf('iphone') !== -1 || ua.indexOf('android') !== -1) ? 5 : 3;

    return {
        color: '#f5a700',
        weight: uaWeight,
        opacity: .7
    }

}

/***************
 *** CLASSES ***
 ***************/


class FacilityCollectionElement {
    constructor (name, iconFileName, GeoFATableArr, GeoFACode) {
        this.name = name;
        this.iconPath = './icons/' + iconFileName;
        this.GeoFA = {
            'table': GeoFATableArr,
            'code': GeoFACode,
            'geoJSON': {}
        };
        this.Leaflet = {
            'icon': L.icon({
                iconUrl: './icons/' + iconFileName,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            }),
            'geoJSON': {}
        };
        this.html = {
            'idName': name + 'Icon',
            'title': name
        };
        this.dataLoaded = false;

        // Adding this to the facility collection object.
        facilityCollection[this.name] = this;

        // Fetching and rendering data from the GeoFA database.
        renderGeoFAdata(this);
    }


    /**
     * Initiating the neccessary Leaflet properties.
     * @param tableName: Self-explanatory in the context of the call.
     */
    initLeafletProp(tableName) {
        let leafletIcon = this.Leaflet.icon;

        if (tableName === FAC_PKT_FRO) {
            // Creating the popup text
            this.GeoFA.geoJSON.pkt.features.forEach((element) => {
                popupText(element);
            });

            // Initiating the leaflet layer.
            this.Leaflet.geoJSON.pkt = L.geoJSON(this.GeoFA.geoJSON.pkt, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, {
                        icon: leafletIcon,
                        pane: 'facility',
                    });
                },

                // Initiating the popup
                onEachFeature: onEachFeature
            });

        } else if (tableName === FAC_FL_FRO) {
            // Creating the popup text
            this.GeoFA.geoJSON.fl.features.forEach((element) => {
                popupText(element);
            });

            this.Leaflet.geoJSON.fl = L.geoJSON(this.GeoFA.geoJSON.fl, {
                style: {
                    weight: 1,
                    color: '#000000',
                    opacity: 1,
                    fillColor: '#156e2d',
                    fillOpacity: 0.3
                },
                onEachFeature: onEachFeature
            });

        } else if (tableName === FAC_LI_FRO) {
            this.GeoFA.geoJSON.li.features.forEach((element) => {
                popupText(element);
            });



            this.Leaflet.geoJSON.li = L.geoJSON(this.GeoFA.geoJSON.li, {
                style: lineStyle(),
                onEachFeature: onEachLineFeature
            });

        } else {
            console.error('ERROR CODE 2: tableName does not match a valid table! \n Value of tableName: ' + tableName + '\n');
        }

    }


}



/*****************
 *** FUNCTIONS ***
 *****************/

/**
 * Fetching data from the GeoFA database.
 * @param sqlSelect: Columns to select.
 * @param sqlFrom: Table.
 * @param sqlWhere: Selects elements based on parameter.
 * @returns {Promise<any>}: Fetched data from the GeoFA Database in JSON.
 */
async function getGeofaData(sqlSelect, sqlFrom, sqlWhere) {
    let url = `https://geofa.geodanmark.dk/api/v2/sql/fkg?q=SELECT ${sqlSelect}` + ' ' +
        `FROM ${sqlFrom} WHERE ${sqlWhere}&format=geojson&geoformat=geojson&srs=4326`;

    try {
        let response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.log(error);
    }
}


/**
 * Renders the data from the GeoFA database.
 * @param facObj: The targeted facility object.
 */
async function renderGeoFAdata(facObj) {
    // Used to determine SELECT, FROM and WHERE.
    let facObjTable = facObj.GeoFA.table;

    // Used for the parameters used in the geoGeofaData-function.
    let data, sqlSelect, sqlFrom, sqlWhere;

    // Initiates all the necessary data.
    function initData(objTable, propName) {

        // Initiating the data as GeoJSON.
        facObj.GeoFA.geoJSON[propName] = {
            'type': 'FeatureCollection',
            'features': data.features
        }

        // Registering that the data has been loaded.
        facObj.dataLoaded = !!(data);

        if (facObj.dataLoaded === true) {
            document.querySelector('#' + facObj.html.idName).style.filter = 'blur(0) grayscale(1)';
        }

        // Initiating the necessary Leaflet data.
        facObj.initLeafletProp(objTable);

    }

    // Iterating through the relevant tables.
    for (let el of facObjTable) {

        // Determining which table it the relevant one.
        if (el === FAC_PKT_FRO) {
            // Determining SELECT, FROM and WHERE.
            sqlSelect =  FAC_PKT_SEL;
            sqlFrom = FAC_PKT_FRO;
            sqlWhere = `facil_ty_k='${facObj.GeoFA.code}'`;

            // Fetching the data
            data = await getGeofaData(sqlSelect, sqlFrom, sqlWhere);

            // Initiating the data.
            initData( el, 'pkt');

        } else if (el === FAC_FL_FRO) {
            sqlSelect = FAC_FL_SEL;
            sqlFrom = FAC_FL_FRO;
            sqlWhere = `facil_ty_k='${facObj.GeoFA.code}'`;

            // Fetching the data
            data = await getGeofaData(sqlSelect, sqlFrom, sqlWhere);

            // Initiating the data.
            initData(el, 'fl');

        } else if (el === FAC_LI_FRO) {
            sqlSelect = FAC_LI_SEL;
            sqlFrom = FAC_LI_FRO;
            sqlWhere = `rute_ty_k='${facObj.GeoFA.code}'`;

            // Fetching the data
            data = await getGeofaData(sqlSelect, sqlFrom, sqlWhere);

            // Initiating the data.
            initData(el, 'li');

        } else {
            console.log('\nCurrent obj:');
            console.log(facObj);
            console.error('ERROR CODE 1: element is not valid! \n Value of element: ' + el);
        }

    }

}

/**
 * Adding a popup to a Leaflet feature.
 * @param feature: Self-explanatory in the context.
 * @param layer: Self-explanatory in the context.
 */
function addPopup(feature, layer) {
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent, popupOptions);
    }
}


/**
 * Applies the addPopup function, to each feature in a layer.
 * @param feature: Self-explanatory in the context.
 * @param layer: Self-explanatory in the context.
 */
function onEachFeature(feature, layer) {
    addPopup(feature, layer);
}


/**
 * This functions controls the popups and highlighting of multiline features, aka trails.
 * @param feature: Self-explanatory in the context.
 * @param layer: Self-explanatory in the context.
 */
function onEachLineFeature(feature, layer) {
    let ua = navigator.userAgent.toLowerCase();
    let uaWeight = (ua.indexOf('iphone') !== -1 || ua.indexOf('android') !== -1) ? 6 : 3;
    let hlStyleOn = {
        color: '#e402f5',
        weight: uaWeight * 1.5, // Original version, value: 6
        opacity: .5 // Original version, value: .7
    };
    let hlStyleOff = lineStyle();

    // Controlling the popup.
    onEachFeature(feature, layer);

    // Highlighting the layer on mouse over.
    layer.on('mouseover', () => {
        layer.setStyle(hlStyleOn);

    });

    layer.on('mouseout', () => {
        layer.setStyle(hlStyleOff);
    });

    // Highlighting the feature on double click.
    layer.on('dblclick', highlightDblClickOn);

    /**
     * Highlighting the feature on double click.
     */
    function highlightDblClickOn() {
        // Stopping the map from zooming on double click.
        map.doubleClickZoom.disable();

        layer.off('mouseout');

        layer.setStyle(hlStyleOn);

        layer.on('dblclick', highlightDblclickOff);

        // Allowing the user to zoom by double-clicking again.
        setTimeout(() => {
            map.doubleClickZoom.enable();
        }, 50);
    }

    /**
     * Turning of the highlighting on double click.
     */
    function highlightDblclickOff() {
        // Stopping the map from zooming on double click.
        map.doubleClickZoom.disable();

        layer.setStyle(hlStyleOff);

        // Readding the turn off highlight on mouse out.
        layer.on('mouseout', () => {
            layer.setStyle(hlStyleOff);
        });

        // Removing the turn off highlight with dbl click.
        layer.off('dblclick');

        layer.on('dblclick', highlightDblClickOn);
    }

}


// Building the popup text.
/**
 * Simple functions that compiles a popup text, from different parameters in the inputted object.
 * @param obj: Feature object, from the facility, fetched from GeoFA.
 */
function popupText(obj) {
    let str = '';

    if (obj.properties.navn != null) {
        str += '<b>' + obj.properties.navn + '</b><br> ';
    }

    if (obj.properties.beskrivels != null) {
        str += obj.properties.beskrivels + '. ';
    }

    if (obj.properties.lang_beskr != null) {
        str += obj.properties.lang_beskr + '. ';
    }

    if (obj.properties.ansvar_org != null && obj.properties.kontak_ved != null) {
        str += obj.properties.ansvar_org + ' har ansvaret for denne facilitet og kan kontaktes på: ' + obj.properties.kontak_ved + '. ';
    }

    if (obj.properties.vandhane_k != null) {
        let vandhane_k = obj.properties.vandhane_k;

        // For some god forsaken reason I cannot do this as a switch statement
        if (vandhane_k === 0) {
            str += 'Der er ingen vandhane tilgængelig ved faciliteten. ';
        } else if (vandhane_k === 1) {
            str += 'Der bør være en vandhane tilgængelig ved faciliteten. ';
        } else if (vandhane_k === 2) {
            str += 'Der bør være vandhane ved faciliteten, men den kan ikke' +
                'forventes at være tilgængelig året rundt. ';

        } else if (vandhane_k === 3) {
            str += 'Det er ukendt om der er en vandhane tilgængelig ved faciliteten. ';
        }
    }

    if (obj.properties.saeson_k != null) {
        switch (obj.properties.saeson_k) {
            case 1:
                str += 'Faciliteten har helårsåbent. ';
                break;
            case 2:
                str += 'Faciliteten har sæsonåbent' + ((obj.properties.saeson_st != null) ? 'fra ' + obj.properties.saeson_st.toString() : '. ')
                    + ((obj.properties.saeson_sl != null) ? ' til ' + obj.properties.saeson_sl.toString() + ' (MM-DD). ' : '. Sæson afslutningen er ikke oplyst');
                break;

            case 7:
                str += 'Sæsonåbningstider er ikke relevant for denne facilitet. ';
                break;
            default:
        }

        if (obj.properties.saeson_bem != null) {
            str += 'Der er følgende bemærkninger til sæsonåbningstiderne: ' + '\"' + obj.properties.saeson_bem + '.\" ';
        }
    }

    if (obj.properties.book_k != null) {
        switch(obj.properties.book_k) {
            case 0:
                str += 'Faciliteten skal ikke bookes. ';
                break;
            case 1:
                str += 'Faciliteten skal bookes. ';
                break;
            case 2:
                str += 'Der er mulighed for at booke faciliteten, men det er ikke påkrævet. ';
                break;
            case 3:
                str += 'Det er ukendt om faciliteten skal bookes. ';
                break;
            default:
        }
    }

    if (obj.properties.betaling_k != null) {
        if (obj.properties.betaling_k === 0) {
            str += 'Der er ikke påkrævet betaling for faciliteten. ';
        }
        else if (obj.properties.betaling_k === 1) {
            str += 'Der kræves betaling for faciliteten. Information herom bør kunne findes påfølgende link: ' + obj.properties.link + ' ';
        }
    }

    if (obj.properties.betaling_k == null && (obj.properties.link == "" || obj.properties.link == null)) {
        str += 'Der bør kunne findes flere informationer om faciliteten på følgende link: ' + obj.properties.link;
    }

    if (obj.geometry.type === 'MultiLineString') {
        try {
            str += `<br> Denne rutes start-koordinat er: ${obj.geometry.coordinates[0][0][1].toFixed(4).toString()}, ${obj.geometry.coordinates[0][0][0].toFixed(4).toString()}` +
                `<br> Denne rutes slut-koordinat er: ${obj.geometry.coordinates[0].at(-1)[1].toFixed(4).toString()}, ${obj.geometry.coordinates[0].at(-1)[0].toFixed(4).toString()}`;
        } catch(e) {
            /* Handling a known problem where a single route array is not,
            * consistent with the other arrays. */
            if (e.message === 'obj.geometry.coordinates[0][0] is undefined') {
                str += `<br> Denne rutes start-koordinat er: ${obj.geometry.coordinates[1][0][1].toFixed(4).toString()}, ${obj.geometry.coordinates[1][0][0].toFixed(4).toString()}` +
                    `<br> Denne rutes slut-koordinat er: ${obj.geometry.coordinates[1].at(-1)[1].toFixed(4).toString()}, ${obj.geometry.coordinates[1].at(-1)[0].toFixed(4).toString()}`;

            } else {
                console.log(e);
                console.log(e.message);
                console.log(obj)
            }
        }
        
    } else if (obj.geometry.type !== 'MultiPolygon') {
        if (obj.geometry.coordinates[0][1] === undefined) console.log(obj.geometry);
        str += `<br> Dennes facilites koordinat er: ${obj.geometry.coordinates[0][1].toFixed(4).toString()}, ${obj.geometry.coordinates[0][0].toFixed(4).toString()}`;
    }

    // Setting the contents of the popup content.
    obj.properties.popupContent = str;
}


/**
 * Allows for a facility group to be displayed, or hidden from, on the map.
 * @param dataLayer: Layer  of the facility group.
 * @param dataObj: Not used...
 * @param filterVal: The current CSS filter value.
 */
function toggleData(dataLayer, dataObj, filterVal) {

    // Showing the data.
    if (filterVal === 'grayscale(1)' || filterVal === 'blur(0px) grayscale(1)') {
        facilityLayerGroup.addLayer(dataLayer);

    } else if (filterVal === 'grayscale(0)') {
        facilityLayerGroup.removeLayer(dataLayer);

    } else {
        console.log(filterVal);
        console.error('ERROR CODE 4: filterVal does not match any acceptable value! \n Value of filterVal: ' + filterVal + '\n');
    }
}


/**
 * Adding an event listener to an icon.
 * @param facObj: The facility object.
 */
function addIconEventListener(facObj) {
    document.querySelector(facObj.html.id).addEventListener('click', () => {
        if (facObj.dataLoaded === true) {
            let iconEl = document.querySelector(facObj.html.id);
            let filterVal = getComputedStyle(iconEl).getPropertyValue('filter');


            for (let prop in facObj.Leaflet.geoJSON) {
                toggleData(facObj.Leaflet.geoJSON[prop], facObj.Leaflet.geoJSON, filterVal);

                // Unbinding popups, if mapMode is on.
                if (mapMode === true) {
                    let superLayer = facObj.Leaflet.geoJSON[prop]._layers;

                    for (let layer in superLayer) {
                        superLayer[layer].unbindPopup();
                    }
                }
            }

            if (filterVal === 'grayscale(1)' || filterVal === 'blur(0px) grayscale(1)') {
                iconEl.style.filter = 'grayscale(0)';

            } else if (filterVal === 'grayscale(0)') {
                iconEl.style.filter = 'grayscale(1)';

            } else {
                console.error('EROOR CODE 5: filterVal does not match any acceptable value! \n Value of filterVal: ' + filterVal + '\n');
            }
        }
    });
}


/**
 * Adding event listeners to all icons.
 */
function addAllIEL() {
    for (let prop in facilityCollection) {
        addIconEventListener(facilityCollection[prop]);
    }
}


/********************
 *** CONSTRUCTION ***
 ********************/

// Row 0
new FacilityCollectionElement('baalhytte', 'baalhytteIconSVG.svg', [FAC_PKT_FRO], 3091);
new FacilityCollectionElement('baalplads', 'baalpladsIconSVG.svg', [FAC_PKT_FRO, FAC_FL_FRO], 1022);
new FacilityCollectionElement('friTeltning', 'friTeltningIconSVG.svg', [FAC_PKT_FRO, FAC_FL_FRO], 3071);
new FacilityCollectionElement('fritFiskeri', 'fritFiskeriIconSVG.svg', [FAC_PKT_FRO, FAC_FL_FRO], 2171);

// Row 1
new FacilityCollectionElement('hkLund', 'haengekoejelundIconSVG.svg', [FAC_PKT_FRO], 3081);
new FacilityCollectionElement('nationalpark', 'nationalparkIconSVG.svg', [FAC_PKT_FRO, FAC_FL_FRO], 2121);
new FacilityCollectionElement('naturpark', 'naturparkIconSVG.svg', [FAC_PKT_FRO, FAC_FL_FRO], 2111);
new FacilityCollectionElement('shelter', 'shelterSVG.svg', [FAC_PKT_FRO], 3012);

// Row 2
new FacilityCollectionElement('spejderhytte', 'spejderhytteIconSVG.svg', [FAC_PKT_FRO], 1082);
new FacilityCollectionElement('teltplads', 'teltPladsIconSVG.svg', [FAC_PKT_FRO, FAC_FL_FRO], 3031);
new FacilityCollectionElement('toervejrsrum', 'toervejrsrum:madpakkehusIconSVG.svg', [FAC_PKT_FRO], 1132);
new FacilityCollectionElement('vandpost', 'vandpostIconSVG.svg', [FAC_PKT_FRO], 1222);

// Row 3
new FacilityCollectionElement('toilet', 'wcSVG.svg', [FAC_PKT_FRO], 1012);
new FacilityCollectionElement('vandrerute', 'vandreruteIconSVG.svg', [FAC_LI_FRO], 5);
new FacilityCollectionElement('motionsrute', 'motionsruteIconSVG.svg', [FAC_LI_FRO], 6);
new FacilityCollectionElement('rekreativSti', 'rekreativStiIconSVG.svg', [FAC_LI_FRO], 11);