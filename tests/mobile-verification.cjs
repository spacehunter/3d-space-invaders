const fs = require('fs');
const path = require('path');

const repo = '/home/nova/3d-space-invaders';

console.log('═══════════════════════════════════════════');
console.log('MOBILE-FRIENDLY VERIFICATION REPORT');
console.log('═══════════════════════════════════════════\n');

const checks = [];

// ===== INDEX.HTML CHECKS =====
const indexHtml = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
const touchInputJs = fs.readFileSync(path.join(repo, 'js/touch-input.js'), 'utf8');

const htmlChecks = {
    // Viewport meta tag
    'Viewport meta tag (user-scalable=no)': /user-scalable=no/.test(indexHtml),
    'Viewport meta tag (minimum-scale)': /minimum-scale=/.test(indexHtml),
    'Viewport meta tag (maximum-scale)': /maximum-scale=/.test(indexHtml),
    'Viewport meta tag (viewport-fit=cover)': /viewport-fit=cover/.test(indexHtml),
    // Touch controls — created dynamically by touch-input.js createTouchUI()
    // These are checked in JS section below since they require touchInputJs variable
    // Mobile game over overlay
    'mobileGameOver div present': /id="mobileGameOver"/.test(indexHtml),
    'mobileRestartBtn present': /id="mobileRestartBtn"/.test(indexHtml),
    'mobileLandingBtn present': /id="mobileLandingBtn"/.test(indexHtml),
    'mobile game-over text div': /mobile-gameover-text/.test(indexHtml),
    'mobile game-over buttons container': /mobile-gameover-buttons/.test(indexHtml),
    // Desktop restart button
    'restartBtn button present': /id="restartBtn"/.test(indexHtml),
    // Mobile pause button
    'mobilePauseBtn present': /id="mobilePauseBtn"/.test(indexHtml),
    // Landing page mobile support
    'landing mobile hint present': /landing-mobile-hint/.test(indexHtml),
    // Bestiary mobile nav
    'bestiaryMobilePrev present': /id="bestiaryMobilePrev"/.test(indexHtml),
    'bestiaryMobileNext present': /id="bestiaryMobileNext"/.test(indexHtml),
    'bestiary-mobile-nav div': /bestiary-mobile-nav/.test(indexHtml),
    'bestiary-mobile-btn class': /bestiary-mobile-btn/.test(indexHtml),
    // Safe area support
    'safe-area-inset-top': /safe-area-inset-top/.test(indexHtml),
    'safe-area-inset-right': /safe-area-inset-right/.test(indexHtml),
    'safe-area-inset-bottom': /safe-area-inset-bottom/.test(indexHtml),
    'safe-area-inset-left': /safe-area-inset-left/.test(indexHtml),
    // CSS touch prevention
    'touch-action: none on body': /touch-action:\s*none/.test(indexHtml),
    'touch-action: none on canvas': /canvas\.style\.touchAction/.test(touchInputJs),
    'user-select: none on body': /user-select:\s*none/.test(indexHtml),
    '-webkit-touch-callout: none': /-webkit-touch-callout:\s*none/.test(indexHtml),
    'overscroll-behavior: none on html': /overscroll-behavior:\s*none/.test(indexHtml),
    'overscroll-behavior-y: contain': /overscroll-behavior-y:\s*contain/.test(indexHtml),
    // Landscape adjustments
    'Landscape orientation media query': /orientation:\s*landscape/.test(indexHtml),
    'Portrait orientation media query': /orientation:\s*portrait/.test(indexHtml),
    // Mobile hover/pointer media queries
    'hover none and pointer coarse media query': /hover:\s*none.*pointer:\s*coarse|pointer:\s*coarse.*hover:\s*none/.test(indexHtml),
    // Touch control CSS rules
    'joystickZone CSS': /#joystickZone/.test(indexHtml),
    'fireZone CSS': /#fireZone/.test(indexHtml),
    'joystickBase CSS': /#joystickBase/.test(indexHtml),
    'fireBtn CSS': /#fireBtn/.test(indexHtml),
    'mobilePauseBtn CSS': /#mobilePauseBtn/.test(indexHtml),
};

console.log('─── HTML STRUCTURE CHECKS ───');
for (const [name, result] of Object.entries(htmlChecks)) {
    console.log(`  ${result ? '✓' : '✗'} ${name}`);
    checks.push({ category: 'HTML', name, result });
}

// ===== CSS CHECKS =====
const cssChecks = {
    // Global overflow prevention
    'body overflow: hidden': /body\s*\{[^}]*overflow:\s*hidden/.test(indexHtml),
    'html overflow: hidden': /html\s*\{[^}]*overflow:\s*hidden/.test(indexHtml),
    // Touch control visibility
    'touchControls display: none by default': /#touchControls\s*\{[^}]*display:\s*none/.test(indexHtml),
    'touchControls display: block on mobile': /#touchControls\s*\{[^}]*display:\s*block/.test(indexHtml),
    // Mobile landing page styles
    'landing page mobile font size adjustment': /game-title\s*\{[^}]*font-size:\s*48px/.test(indexHtml),
    // Mobile game over overlay display
    'mobile game-over display: none': /#mobileGameOver\s*\{[^}]*display:\s*none/.test(indexHtml),
    'mobile game-over visible class': /#mobileGameOver\.visible/.test(indexHtml),
    // Mobile game over button styles
    'mobile game-over button styles': /\.mobile-go-btn/.test(indexHtml),
    // Touch action on mobile buttons
    'touch-action: none on mobile buttons': /\.mobile-go-btn[^}]*touch-action:\s*none/.test(indexHtml),
    // Safe area padding
    'safe area padding on touchControls': /padding:\s*env\s*\(/.test(indexHtml),
    // Landscape touch control adjustments
    'landscape joystick zone adjustment': /#joystickZone[^}]*height:\s*100%/.test(indexHtml),
    'landscape fire zone adjustment': /#fireZone[^}]*height:\s*100%/.test(indexHtml),
    // Mobile UI adjustments
    'mobile UI font size reduction': /#ui\s*\{[^}]*font-size:\s*18px/.test(indexHtml),
    // Settings hidden on mobile
    'settings hidden on mobile': /#settingsPanel[^}]*display:\s*none/.test(indexHtml),
    // Instructions hidden on mobile
    'instructions hidden on mobile': /#instructions\s*\{[^}]*display:\s*none/.test(indexHtml),
};

console.log('\n─── CSS CHECKS ───');
for (const [name, result] of Object.entries(cssChecks)) {
    console.log(`  ${result ? '✓' : '✗'} ${name}`);
    checks.push({ category: 'CSS', name, result });
}

// ===== JS CHECKS =====
const mainJs = fs.readFileSync(path.join(repo, 'js/main.js'), 'utf8');
const gameJs = fs.readFileSync(path.join(repo, 'js/game.js'), 'utf8');
const inputJs = fs.readFileSync(path.join(repo, 'js/input.js'), 'utf8');

const jsChecks = {
    // main.js
    'main.js: initTouchInput called': /initTouchInput\(\)/.test(mainJs),
    'main.js: mobilePauseBtn event listener': /getElementById\('mobilePauseBtn'\).*addEventListener/.test(mainJs) || /pauseBtn.*addEventListener/.test(mainJs),
    'main.js: restartBtn event listener': /getElementById\('restartBtn'\).*addEventListener/.test(mainJs) || /desktopRestartBtn.*addEventListener/.test(mainJs),
    'main.js: landing page touch handlers': /landingStartNew.*addEventListener.*touchend/.test(mainJs) || /landingStartNew.*click\(\)/.test(mainJs),
    'main.js: bestiary mobile prev': /bestiaryMobilePrev/.test(mainJs),
    'main.js: bestiary mobile next': /bestiaryMobileNext/.test(mainJs),
    'main.js: mobileGameOver visible class': /mobileGameOver.*classList.*add\('visible'\)|mobileGameOver\.classList.*add/.test(mainJs),
    // game.js
    'game.js: mobileGameOver shown on game over': /mobileGameOver.*classList.*add\('visible'\)/.test(gameJs),
    'game.js: _resetGame exported': /window\._resetGame/.test(gameJs),
    'game.js: _returnToLanding exported': /window\._returnToLanding/.test(gameJs),
    'game.js: returnToLanding hides mobile game over': /mobileGameOver.*classList.*remove\('visible'\)/.test(gameJs),
    // input.js
    'input.js: touch sync exports': /syncTouchX/.test(inputJs),
    'input.js: getMovementX exists': /getMovementX/.test(inputJs),
    // touch-input.js
    'touch-input.js: touchstart handler': /touchstart/.test(touchInputJs),
    'touch-input.js: touchmove handler': /touchmove/.test(touchInputJs),
    'touch-input.js: touchend handler': /touchend/.test(touchInputJs),
    'touch-input.js: joystick radius with min': /MIN_JOYSTICK_R/.test(touchInputJs),
    'touch-input.js: fire radius with min': /MIN_FIRE_R/.test(touchInputJs),
    'touch-input.js: touch-action: none on canvas': /canvas\.style\.touchAction/.test(touchInputJs),
    'touch-input.js: passive: false on touch events': /passive:\s*false/.test(touchInputJs),
    'touch-input.js: preventDefault on touchstart': /e\.preventDefault/.test(touchInputJs),
};

console.log('\n─── JAVASCRIPT CHECKS ───');
for (const [name, result] of Object.entries(jsChecks)) {
    console.log(`  ${result ? '✓' : '✗'} ${name}`);
    checks.push({ category: 'JS', name, result });
}

// ===== SUMMARY =====
const total = checks.length;
const passed = checks.filter(c => c.result).length;
const failed = total - passed;

console.log(`\n═══════════════════════════════════════════`);
console.log(`RESULT: ${passed}/${total} checks passed`);
if (failed === 0) {
    console.log('ALL CHECKS PASSED ✓');
} else {
    console.log(`FAILED: ${failed} checks did not pass`);
    console.log('\nFailed checks:');
    checks.filter(c => !c.result).forEach(c => console.log(`  ✗ [${c.category}] ${c.name}`));
}

// Save report
const report = {
    total,
    passed,
    failed,
    checks: checks.map(c => ({ ...c, result: c.result ? 'PASS' : 'FAIL' })),
};
fs.writeFileSync(path.join(repo, 'test-results/mobile-verification.json'), JSON.stringify(report, null, 2));
console.log(`\nDetailed report saved to ${path.join(repo, 'test-results/mobile-verification.json')}`);

// Exit nonzero when any check failed so CI and runners can detect failures
if (failed > 0) {
    process.exit(1);
}