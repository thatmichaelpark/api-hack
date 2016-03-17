/*
to do:
flexbox?
*/
'use strict'

// API key courtesy of 8coupons.com
var key = '1152c7393828d39ffd2fb7d33fa44b42640aa8445ac957e155fac327a00774b6be5ce7a07d17c12f687f6b945616878c';
var map;

var categories = {};
var markers = [];

$(function () {	// Everything starts here.

	initMap();	// First, initialize the Google map.

	// Then, get category/subcategory information (e.g., 'restaurant', 'pizza').
	getJSONP('http://api.8coupons.com/v1/getsubcategory').then(function (ss) {
		ss.forEach(function (s) {
			if (categories[s.category] === undefined) {		// The first time we see a category, we
				categories[s.category] = {					// add it to the categories collection...
					name: s.category,
					id: s.categoryID,
					subcategories: []
				};
															// ... and add it to the dropdown list.
				$('#category').append('<option value="' + s.category + '">' + s.category + '</option>');
			}

			categories[s.category].subcategories.push({		// Save subcategory info.
				name: s.subcategory,
				id: s.subcategoryID
			});
		});

		initEventHandlers();	// Now that the dropdown is populated, we can enable event handlers.
	});
});

function initMap() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (pos) {
			var latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
			map = new google.maps.Map(
				document.getElementById('map'),
				{
					center: latLng,
					zoom: 12
				}
			);
		},
		function (error) {
			console.log(error);
			map = new google.maps.Map(
				document.getElementById('map'),
				{
					center: new google.maps.LatLng(0, 0),
					zoom: 1
				}
			);
		});
	} else {
		console.log('no geolocation :(');
	}
}

function initEventHandlers() {

	$('body').on('click', 'div.deal', function (e) {
		if ($(e.target).is('a')) {	// If the <a> was clicked, ignore the click.
			return;
		}
		if ($(this).hasClass('selected')) {
			$('div.deal.selected div.deal-details').slideUp();
			$('div.deal.selected').removeClass('selected');
			markers[$('#output').children().index(this)].setAnimation();
		} else {
			var currentSelected = $('div.deal.selected');
			if (currentSelected[0]) {
				markers[$('#output').children().index(currentSelected)].setAnimation();
				$('div.deal.selected div.deal-details').hide();		
				$('div.deal.selected').removeClass('selected');
			}
			$(this).addClass('selected');
			var top = $(this).position().top + $(this).parent().scrollTop();
			$('#output').animate({ scrollTop: top }, 'slow');
			$(this).find('div.deal-details').slideDown();
			markers[$('#output').children().index(this)].setAnimation(google.maps.Animation.BOUNCE);
		}
	});

	$('form').submit(function (e) {
		e.preventDefault();
		getDeals();
	});
}

var circle;

function getDeals() {
	$('body').addClass('busy');
	
	var radius = Math.round(computeRadius());	// round in case 8coupons api expects an int.
	radius = Math.max(1, radius);				// Make it at least 1.

	if (circle) {
		circle.setMap();
	}
	circle = new google.maps.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.3,
      strokeWeight: 2,
      fillColor: '#FF8800',
      fillOpacity: 0.15,
      map: map,
      center: map.getCenter(),
      radius: radius * 1600 // miles -> m
    });
	
	getJSONP('http://api.8coupons.com/v1/getdeals', {
		key: key,
		lat: map.getCenter().lat(),
		lon: map.getCenter().lng(),
		categoryid: categories[$('#category').val()].id,
		mileradius: radius,
		limit: 20
	})
	.done(function (result) {
		$('body').removeClass('busy');
		$('#output').empty();
		markers.forEach(function (marker) {		// Remove previous markers from map.
			marker.setMap(null);
		})
		markers = [];
		result.forEach(function (r) {
			var template = $('.template .deal').clone();
			template.find('.deal-category').text(makeCategory(r.categoryID, r.subcategoryID));
			template.find('.deal-name').text(r.name);
			template.find('.deal-title').text(r.dealTitle);
			template.find('.address').text(r.address);
			template.find('.phone').text(r.phone);
			template.find('.deal-info').text(r.dealinfo);
			template.find('.disclaimer').text(r.disclaimer);
			template.find('.link a').attr('href', r.URL);
			template.find('.image').attr('src', r.showImageStandardSmall);
			$('#output').append(template);
	
			var latLng = new google.maps.LatLng(r.lat, r.lon);
			
			var marker = new google.maps.Marker({
				position: latLng,
				map: map,
				title: r.name,
				clickable: true
			});
			
			markers.push(marker);

			var infoWindow = new google.maps.InfoWindow({
				content: '<h1>' + r.name + '</h1>' + r.address + '<br>' + r.city + '<br>' + r.phone,
				position: latLng
			});
			
			google.maps.event.addListener(marker, 'click', function () {
//				infoWindow.open(map);

				var title = this.title;
				$('#output span').filter(function () {
					return $(this).text() === title;
				}).parent().trigger('click');
			});
		});
	})
	.fail(function(jqXHR, error){ //this waits for the ajax to return with an error promise object
		console.log(jqXHR);
		console.log(error);
	});
}

function computeRadius() {
	var center = map.getCenter();
	var bounds = map.getBounds();
	var NE = bounds.getNorthEast();
	var radiusN = computeDistance(center.lat(), center.lng(), NE.lat(), center.lng());
	var radiusE = computeDistance(center.lat(), center.lng(), center.lat(), NE.lng());
	return Math.min(radiusN, radiusE);
	
	function computeDistance(lat0, lng0, lat1, lng1) {
		lat0 = degToRad(lat0);
		lng0 = degToRad(lng0);
		lat1 = degToRad(lat1);
		lng1 = degToRad(lng1);
		var earthRadius = 3959;	// miles
		return Math.acos(Math.sin(lat0) * Math.sin(lat1) + Math.cos(lat0) * Math.cos(lat1) * Math.cos(lng0 - lng1)) * earthRadius;
		
		function degToRad(deg) {
			return deg * Math.PI / 180;
		}
	}
}

function makeCategory(catID, subcatID) {
	var ret = '';
	for (var cat in categories) {
		if (categories[cat].id == catID) {
			ret = cat;
			categories[cat].subcategories.forEach(function (sub) {
				if (sub.id == subcatID) {
					ret += '—' + sub.name;
				}
			});
			return ret;
		}
	}
}

function getJSONP(url, params) {
	return $.ajax({
		url: url,
		data: params,
		dataType: "jsonp",
		type: "GET"
	})
};
