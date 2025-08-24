// JavaScript for cycling through hero images and providing manual controls.
// The images array defines the relative paths to each hero photo.  To add
// or remove photos, simply edit this array and place the corresponding
// files in the assets/images directory.

document.addEventListener('DOMContentLoaded', () => {
  const headerEl = document.querySelector('header');
  const leftBtn = document.querySelector('.slider-btn.left');
  const rightBtn = document.querySelector('.slider-btn.right');

  // List of hero images.  Update this list when adding or replacing
  // photos in the assets/images folder.
  const images = [
  'assets/images/hero.jpg',
  'assets/images/image1.jpg',
  'assets/images/image4.jpg'
  ];

  let currentIndex = 0;

  function setHeroBackground(index) {
    headerEl.style.backgroundImage = `url('${images[index]}')`;
  }

  function nextImage() {
    currentIndex = (currentIndex + 1) % images.length;
    setHeroBackground(currentIndex);
  }

  function prevImage() {
    // Add images.length before mod to avoid negative numbers
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    setHeroBackground(currentIndex);
  }

  // Automatically change image every 10 seconds (10000ms)
  let sliderInterval = setInterval(nextImage, 10000);

  // Manual controls restart the timer to provide a smooth user experience
  leftBtn.addEventListener('click', () => {
    prevImage();
    clearInterval(sliderInterval);
    sliderInterval = setInterval(nextImage, 10000);
  });

  rightBtn.addEventListener('click', () => {
    nextImage();
    clearInterval(sliderInterval);
    sliderInterval = setInterval(nextImage, 10000);
  });

  // Initialise with the first image
  setHeroBackground(currentIndex);
});