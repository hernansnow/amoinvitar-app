  if ('loading' in HTMLImageElement.prototype) {
    // Si el navegador soporta lazy-load, tomamos todas las imágenes que tienen la clase
    // `lazyload`, obtenemos el valor de su atributo `data-src` y lo inyectamos en el `src`.
    var images = document.querySelectorAll('img[loading="lazy"]');
        var sources = document.querySelectorAll("source[data-srcset]");
        sources.forEach(function (source) {
            if (source.dataset.srcset) source.srcset = source.dataset.srcset;
        });
        images.forEach(function (img) {
            if (img.dataset.src) img.src = img.dataset.src;   // solo las que traen data-src
        });
  } else {
    // Importamos dinámicamente la libreria `lazysizes`
    let script = document.createElement("script");
    script.async = true;
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.2.0/lazysizes.min.js";
    document.body.appendChild(script);
  }


// audio 1
	$( document ).ready(function() {
    $('#audioModal').modal('toggle')
     });

// audio 2
      function play() {
        var audio = document.getElementById("audio");
        audio.play();
      }

// audio 3
      function Play()
      {
        var myAudio = document.getElementById("audio");
        if(myAudio.paused) {
            myAudio.play();
        }
        else {
           myAudio.pause();
        }
      } 


AOS.init({
 	duration: 800,
 	easing: 'slide',
 	once: false
 });

jQuery(document).ready(function($) {

	"use strict";

	
	$(".loader").delay(1000).fadeOut("slow");
  $("#overlayer").delay(1000).fadeOut("slow");	
  

	var siteMenuClone = function() {

		$('.js-clone-nav').each(function() {
			var $this = $(this);
			$this.clone().attr('class', 'site-nav-wrap').appendTo('.site-mobile-menu-body');
		});


		setTimeout(function() {
			
			var counter = 0;
      $('.site-mobile-menu .has-children').each(function(){
        var $this = $(this);
        
        // En móvil el submenú se muestra desplegado por defecto
        $this.prepend('<span class="arrow-collapse active" aria-expanded="true">');

        $this.find('.arrow-collapse').attr({
          'data-toggle' : 'collapse',
          'data-target' : '#collapseItem' + counter,
        });

        $this.find('> ul').attr({
          'class' : 'collapse show',
          'id' : 'collapseItem' + counter,
        });

        counter++;

      });

    }, 1000);

		$('body').on('click', '.arrow-collapse', function(e) {
      var $this = $(this);
      if ( $this.closest('li').find('.collapse').hasClass('show') ) {
        $this.removeClass('active');
      } else {
        $this.addClass('active');
      }
      e.preventDefault();  
      
    });

		$(window).resize(function() {
			var $this = $(this),
				w = $this.width();

			if ( w > 768 ) {
				if ( $('body').hasClass('offcanvas-menu') ) {
					$('body').removeClass('offcanvas-menu');
				}
			}
		})

		$('body').on('click', '.js-menu-toggle', function(e) {
			var $this = $(this);
			e.preventDefault();

			if ( $('body').hasClass('offcanvas-menu') ) {
				$('body').removeClass('offcanvas-menu');
				$this.removeClass('active');
			} else {
				$('body').addClass('offcanvas-menu');
				$this.addClass('active');
			}
		}) 

		// click outisde offcanvas
		$(document).mouseup(function(e) {
	    var container = $(".site-mobile-menu");
	    if (!container.is(e.target) && container.has(e.target).length === 0) {
	      if ( $('body').hasClass('offcanvas-menu') ) {
					$('body').removeClass('offcanvas-menu');
				}
	    }
		});
	}; 
	siteMenuClone();


	var sitePlusMinus = function() {
		$('.js-btn-minus').on('click', function(e){
			e.preventDefault();
			if ( $(this).closest('.input-group').find('.form-control').val() != 0  ) {
				$(this).closest('.input-group').find('.form-control').val(parseInt($(this).closest('.input-group').find('.form-control').val()) - 1);
			} else {
				$(this).closest('.input-group').find('.form-control').val(parseInt(0));
			}
		});
		$('.js-btn-plus').on('click', function(e){
			e.preventDefault();
			$(this).closest('.input-group').find('.form-control').val(parseInt($(this).closest('.input-group').find('.form-control').val()) + 1);
		});
	};
	// sitePlusMinus();


	var siteSliderRange = function() {
    $( "#slider-range" ).slider({
      range: true,
      min: 0,
      max: 500,
      values: [ 75, 300 ],
      slide: function( event, ui ) {
        $( "#amount" ).val( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
      }
    });
    $( "#amount" ).val( "$" + $( "#slider-range" ).slider( "values", 0 ) +
      " - $" + $( "#slider-range" ).slider( "values", 1 ) );
	};
	// siteSliderRange();


	
	var siteCarousel = function () {
		if ( $('.nonloop-block-13').length > 0 ) {
			$('.nonloop-block-13').owlCarousel({
		    center:false,
		    items: 1,
		    loop: true,
			stagePadding: 0,
		    margin: 0,
		    autoplay: true,
		    nav: true,
			navText: ['<span class="icon-arrow_back">', '<span class="icon-arrow_forward">'],
		    responsive:{
	            600:{
	        	margin: 0,
	        	nav: true,
	          items: 2
	        },
	        1000:{
	        	margin: 0,
	        	stagePadding: 0,
	        	nav: true,
	          items: 3
	        },
	        1200:{
	        	margin: 0,
	        	stagePadding: 0,
	        	nav: true,
	          items: 4
	        }
		    }
			});
		}

		$('.slide-one-item').owlCarousel ({
	    center: false,
	    items: 1,
	    loop: true,
		stagePadding: 0,
	    margin: 0,
	    autoplay: true,
	    pauseOnHover: true,
		autoplayTimeout:3500,
        autoplayHoverPause:true,
	    nav: true,
	    navText: ['<span class="icon-keyboard_arrow_left">', '<span class="icon-keyboard_arrow_right">']
	  });
$('.play').on('click',function(){
    owl.trigger('play.owl.autoplay',[1000])
})
$('.stop').on('click',function(){
    owl.trigger('stop.owl.autoplay')
})

	  // $('.slide-one-item-alt').owlCarousel({
	  //   center: false,
	  //   items: 1,
	  //   loop: true,
			// stagePadding: 0,
			// smartSpeed: 700,
	  //   margin: 0,
	  //   autoplay: true,
	  //   pauseOnHover: false,

	  // });

	  // $('.slide-one-item-alt-text').owlCarousel({
	  //   center: false,
	  //   items: 1,
	  //   loop: true,
			// stagePadding: 0,
			// smartSpeed: 700,
	  //   margin: 0,
	  //   autoplay: true,
	  //   pauseOnHover: false,
	  // });

	  $('.slide-one-item-alt').owlCarousel({
	    center: false,
	    items: 1,
	    loop: true,
			stagePadding: 0,
	    margin: 0,
	    smartSpeed: 1000,
	    autoplay: true,
	    pauseOnHover: true,
	    onDragged: function(event) {
	    	console.log('event : ',event.relatedTarget['_drag']['direction'])
	    	if ( event.relatedTarget['_drag']['direction'] == 'left') {
	    		$('.slide-one-item-alt-text').trigger('next.owl.carousel');
	    	} else {
	    		$('.slide-one-item-alt-text').trigger('prev.owl.carousel');
	    	}
	    }
	  });
	  $('.slide-one-item-alt-text').owlCarousel({
	    center: false,
	    items: 1,
	    loop: true,
			stagePadding: 0,
	    margin: 0,
	    smartSpeed: 1000,
	    autoplay: true,
	    pauseOnHover: true,
	    onDragged: function(event) {
	    	console.log('event : ',event.relatedTarget['_drag']['direction'])
	    	if ( event.relatedTarget['_drag']['direction'] == 'left') {
	    		$('.slide-one-item-alt').trigger('next.owl.carousel');
	    	} else {
	    		$('.slide-one-item-alt').trigger('prev.owl.carousel');
	    	}
	    }
	  });
	  

	  $('.custom-next').click(function(e) {
	  	e.preventDefault();
	  	$('.slide-one-item-alt').trigger('next.owl.carousel');
	  	$('.slide-one-item-alt-text').trigger('next.owl.carousel');
	  });
	  $('.custom-prev').click(function(e) {
	  	e.preventDefault();
	  	$('.slide-one-item-alt').trigger('prev.owl.carousel');
	  	$('.slide-one-item-alt-text').trigger('prev.owl.carousel');
	  });
	  
	};
	siteCarousel();

	var siteStellar = function() {
		$(window).stellar({
	    responsive: false,
	    parallaxBackgrounds: true,
	    parallaxElements: true,
	    horizontalScrolling: false,
	    hideDistantElements: false,
	    scrollProperty: 'scroll'
	  });
	};
	// siteStellar();

	var siteCountDown = function() {

		$('#date-countdown').countdown('2020/10/10', function(event) {
		  var $this = $(this).html(event.strftime(''
		    + '<span class="countdown-block"><span class="label">%w</span> weeks </span>'
		    + '<span class="countdown-block"><span class="label">%d</span> days </span>'
		    + '<span class="countdown-block"><span class="label">%H</span> hr </span>'
		    + '<span class="countdown-block"><span class="label">%M</span> min </span>'
		    + '<span class="countdown-block"><span class="label">%S</span> sec</span>'));
		});
				
	};
	// Solo si la página cargó la librería de cuenta regresiva (las Basic no la llevan)
	if ($.fn.countdown && $('#date-countdown').length) siteCountDown();

	var siteDatePicker = function() {

		if ( $('.datepicker').length > 0 ) {
			$('.datepicker').datepicker();
		}

	};
	siteDatePicker();

	var siteSticky = function() {
		$(".js-sticky-header").sticky({topSpacing:0});
	};
	siteSticky();

	// navigation
  var OnePageNavigation = function() {
    var navToggler = $('.site-menu-toggle');
   	$("body").on("click", ".main-menu li a[href^='#'], .smoothscroll[href^='#'], .site-mobile-menu .site-nav-wrap li a", function(e) {
      var hash = this.hash;
      var destino = hash && $(hash);
      if (!destino || !destino.length) return;   // sin sección de destino: no se traba el clic
      e.preventDefault();

      // Si jquery.easing todavía no cargó, se usa el movimiento estándar
      var easing = ($.easing && $.easing.easeInOutExpo) ? 'easeInOutExpo' : 'swing';
      $('html, body').stop().animate({
        'scrollTop': destino.offset().top
      }, 600, easing, function(){
        if (history.replaceState) history.replaceState(null, '', hash); else window.location.hash = hash;
      });

    });
  };
  OnePageNavigation();

  var siteScroll = function() {

  	

  	$(window).scroll(function() {

  		var st = $(this).scrollTop();

  		if (st > 100) {
  			$('.js-sticky-header').addClass('shrink');
  		} else {
  			$('.js-sticky-header').removeClass('shrink');
  		}

  	}) 

  };
  siteScroll();

	var siteIstotope = function() {
	// init Isotope
var $container = $('#posts').isotope({
   itemSelector : '.item',
	    isFitWidth: true
	  });

// layout Isotope after each image loads
$container.imagesLoaded().progress( function() {
  $container.isotope('layout');
}); 
	
	
	  
 $container.isotope({ filter: '*' });
 $container.isotope("reloadItems").isotope({
    sortBy: "random"
});

	    // filter items on button click
	  $('#filters').on( 'click', 'button', function() {
	    var filterValue = $(this).attr('data-filter');
	    $container.isotope({ filter: filterValue });
	    $('#filters button').removeClass('active');
	    $(this).addClass('active');
	  });
  }

  // Solo si la página tiene galería filtrable y cargó Isotope (evita cortar el resto del script)
  if ($.fn.isotope && $('#posts').length) siteIstotope();
	


  $('.fancybox').on('click', function() {
	  var visibleLinks = $('.fancybox');

	  $.fancybox.open( visibleLinks, {}, visibleLinks.index( this ) );

	  return false;
	});

});

//  Set caption from card text
$('.card-deck a').fancybox({
  caption : function( instance, item ) {
    return $(this).parent().find('.card-text').html();
  }
});

$('.linkPinIt').click(function() {
    var url = $(this).attr('href');
    var media = $(this).attr('data-image');
    var desc = $(this).attr('data-desc');
    window.open("//www.pinterest.com/pin/create/button/"+
    "?url="+url+
    "&media="+media+
    "&description="+desc,"_blank", "toolbar=no, scrollbars=no, resizable=no, top=0, right=0, width=750, height=320");
    return false;
});


function openEquipo() {
  document.getElementById("equipo-pop").style.height = "100%";
}

function closeEquipo() {
  document.getElementById("equipo-pop").style.height = "0%";
}



$('#carousel-entrega').carousel({
  interval: 3500
})


$('.entrega-full').owlCarousel({
    center: true,
    loop:true,
    margin:10,
	autoplay:true,
    autoplayTimeout:3500,
	nav: true,
	    navText: ['<span class="icon-keyboard_arrow_left">', '<span class="icon-keyboard_arrow_right">'],
    responsiveClass:true,
    responsive:{
        0:{
            items:1,
			pagination: false,
	        dots: false,
        },
        600:{
            items:2,
        },
        1000:{
            items:2,
        }
    }
})



$('.galeria-mobile').owlCarousel({
    center: true,
	autoplay:true,
	autoplayTimeout:3500,
    loop:true,
    margin:10,
	merge:true,
	nav: true,
	dots: false,
	    navText: ['<span class="icon-keyboard_arrow_left">', '<span class="icon-keyboard_arrow_right">'],
    responsiveClass:true,
    responsive:{
        0:{
            items:2,
			mergeFit:true
        },
        600:{
            items:2,
			mergeFit:true,
        },
        1000:{
            items:2,
			mergeFit:true,
        }
    }
})

$('.galeria-15').owlCarousel({
    center: true,
    loop:true,
    margin:10,
	autoplay:true,
    autoplayTimeout:3500,
	nav: true,
	pagination: false,
	dots: false,
	    navText: ['<span class="icon-keyboard_arrow_left">', '<span class="icon-keyboard_arrow_right">'],
    responsiveClass:true,
    responsive:{
        0:{
            items:1,
        },
        600:{
            items:2,
        },
        1000:{
            items:2,
        }
    }
})

$('[data-fancybox]').fancybox({
	toolbar  : false,
	smallBtn : true,
	iframe : {
		preload : false
	}
})

$(window).on("load",function() {
     $('.carousel-item').removeClass("d-block");
})

//  copiar
function copiarId(id) {
    navigator.clipboard.writeText(
        document.getElementById(id).innerText
    );

    const aviso = document.createElement('div');
    aviso.innerHTML = '✓ Copiado';
    aviso.style.cssText = `
        position:fixed;
        top:20px;
        left:50%;
        transform:translateX(-50%);
        background:#000;
        color:#fff;
        padding:10px 20px;
        border-radius:5px;
        z-index:99999;
    `;

    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.remove();
    }, 1500);
}
// Portada: ajusta la invitación real al ancho del celular del mockup (.ai-devs)
(function () {
  function fit() {
    document.querySelectorAll('.ai-devs .dev-phone iframe').forEach(function (f) {
      var p = f.parentElement, k = p.clientWidth / 390;
      if (!k) return;
      f.style.transform = 'scale(' + k + ')';
      f.style.height = (p.clientHeight / k) + 'px';
    });
  }
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  document.addEventListener('DOMContentLoaded', fit);
})();

// Videos de fondo (Vimeo) con versión escritorio/móvil: se carga solo el
// iframe visible (data-src → src). Si cambia el tamaño, se revisa de nuevo.
(function () {
  function cargarVideosVisibles() {
    document.querySelectorAll('.video-container iframe[data-src]').forEach(function (f) {
      if (f.getClientRects().length) {
        f.src = f.getAttribute('data-src');
        f.removeAttribute('data-src');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cargarVideosVisibles);
  else cargarVideosVisibles();
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(cargarVideosVisibles, 250); });
})();
