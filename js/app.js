'use strict'

var key = '1152c7393828d39ffd2fb7d33fa44b42640aa8445ac957e155fac327a00774b6be5ce7a07d17c12f687f6b945616878c';
var map;

function APItest(url, params) {
	return $.ajax({
		url: url,
		data: params,
		dataType: "jsonp",
		type: "GET"
	})
};

var categories = {};

function setSubcategories(c) {
	$('#subcategory').empty();
	categories[c].subcategories.forEach(function (s) {
		$('#subcategory').append('<option value="' + s.name + '">' + s.name + '</option>');
	});
	
}

$(function () {
	var allPanels;
	var markers = [];
	var dealinfos = [];

	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (pos) {
			var latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
			map = new google.maps.Map(
				document.getElementById('map'),
				{
					center: latLng,
					zoom: 11
				}
			);
		},
		function (error) {
			console.log(error);;;
		});
	} else {
		console.log('no geolocation :(');
	}

	$('body').on('click', 'div.dealinfo', function () {
		allPanels.slideUp();
		$(this).children().eq(0).slideDown();
		markers[$(this).parent().children().index(this)].setAnimation(google.maps.Animation.BOUNCE);

		return false;
	});
	$('form').submit(function (e) {
		e.preventDefault();
		console.log('sending');;;
		APItest('http://api.8coupons.com/v1/getdeals', {
			key: key,
			lat: map.getCenter().lat(),
			lon: map.getCenter().lng(),
			categoryid: categories[$('#category').val()].id,
			mileradius: $('#radius').val(),
			limit: 20
		})
		.done(function (result) {
			$('#output').empty();
			markers = [];
console.log('result', result);;;
			result.forEach(function (r) {
				$('#output').append('<div class="dealinfo" name="'
				+ r.name + '">'
					+ r.DealTypeID + ', '
					+ r.categoryID + ', '
					+ r.subcategoryID + ', '
					+ r.name + ', '
					+ r.dealTitle + ', '
					+ '<div class="dealdetails">' +
						r.address + ', ' +
						r.city + ', ' +
						r.state + ', ' +
						r.city + ', ' +
						r.ZIP + ', ' +
						r.phone + ', ' +
						r.dealinfo + ', ' +
						r.disclaimer +
						'<a href="' + r.URL + '">Get Coupon</a>' +
					'</div>'
				+ '</div>');

				allPanels = $('div.dealdetails').hide();
			
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
					infoWindow.open(map);
//					$('div[name="' + this.title + '"]').trigger('click');
					var top = $('div[name="' + this.title + '"]').position().top +
						$('div[name="' + this.title + '"]').parent().scrollTop();
					$('#output').animate({ scrollTop: top }, 'slow');
				});
			});
		})
		.fail(function(jqXHR, error){ //this waits for the ajax to return with an error promise object
			console.log(jqXHR);
			console.log(error);
		});
	});

	
	var a = APItest('http://api.8coupons.com/v1/getcategory');
	var b = APItest('http://api.8coupons.com/v1/getsubcategory');
	var c = APItest('http://api.8coupons.com/v1/getdealtype');
	
	$.when(a, b, c).then(function (cs, ss, ds) {
		cs[0].forEach(function (c) {
			categories[c.category] = {
				name: c.category,
				id: c.categoryID,
				subcategories: []
			};
			$('#category').append('<option value="' + c.category + '">' + c.category + '</option>');
		});
		ss[0].forEach(function (s) {
			categories[s.category].subcategories.push({
				name: s.subcategory,
				id: s.subcategoryID
			});
		});
	});
});