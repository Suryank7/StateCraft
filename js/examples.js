// ============================================================
// StateCraft — Example State Machines Library
// Pre-built examples for instant exploration
// ============================================================

export const EXAMPLES = [
  {
    id: 'login',
    title: 'Login Form',
    icon: '🔐',
    desc: '4 states — Authentication flow',
    text: `The login form starts in the idle state.
From idle, submitting the form transitions to loading.
From loading, if authentication succeeds, go to success state.
From loading, if authentication fails, go to error state.
From error, clicking retry goes back to idle.
Success is the final state.
Error is an error state.`
  },
  {
    id: 'checkout',
    title: 'E-Commerce Checkout',
    icon: '🛒',
    desc: '6 states — Multi-step purchase flow',
    text: `The checkout flow starts in the cart state.
From cart, clicking proceed goes to shipping.
From shipping, filling details and clicking next goes to payment.
From payment, clicking pay goes to processing.
From processing, if payment succeeds go to confirmation.
From processing, if payment fails go to payment_error.
From payment_error, retrying goes back to payment.
From confirmation, shopping more goes to cart.
Confirmation is the final state.
Payment_error is an error state.`
  },
  {
    id: 'media',
    title: 'Media Player',
    icon: '🎵',
    desc: '5 states — Audio/video playback',
    text: `The media player starts in the stopped state.
From stopped, pressing play goes to playing.
From playing, pressing pause goes to paused.
From playing, the track ending goes to stopped.
From playing, network issues cause buffering.
From paused, pressing play goes to playing.
From paused, pressing stop goes to stopped.
From buffering, data received goes to playing.
From buffering, timeout goes to error.
From error, pressing retry goes to stopped.
Error is an error state.`
  },
  {
    id: 'upload',
    title: 'File Upload',
    icon: '📁',
    desc: '6 states — File upload with validation',
    text: `File upload begins in the empty state.
From empty, selecting a file goes to validating.
From validating, if the file is valid go to ready.
From validating, if the file is invalid go to invalid.
From invalid, selecting another file goes back to validating.
From ready, clicking upload goes to uploading.
From uploading, upload completes and goes to complete.
From uploading, upload fails and goes to failed.
From failed, retrying goes to uploading.
From complete, uploading another goes to empty.
Complete is the final state.
Invalid and failed are error states.`
  },
  {
    id: 'modal',
    title: 'Animated Modal',
    icon: '💬',
    desc: '4 states — UI dialog lifecycle',
    text: `The modal starts in the closed state.
From closed, triggering open starts the opening animation.
From opening, when animation completes go to open.
From open, triggering close starts the closing animation.
From closing, when animation completes go to closed.
From open, pressing escape starts the closing animation.`
  },
  {
    id: 'fetch',
    title: 'Data Fetching',
    icon: '🌐',
    desc: '5 states — API request lifecycle',
    text: `Data fetching starts in the idle state.
From idle, initiating a request goes to loading.
From loading, receiving data goes to success.
From loading, receiving an error goes to failure.
From loading, user cancels and goes to idle.
From success, refetching goes to loading.
From failure, retrying goes to loading.
From failure, giving up goes to idle.
Success is the final state.
Failure is an error state.`
  },
  {
    id: 'wizard',
    title: 'Multi-Step Wizard',
    icon: '🧙',
    desc: '7 states — Form wizard with validation',
    text: `The wizard starts at step_one.
From step_one, clicking next goes to validating_one.
From validating_one, if valid go to step_two.
From validating_one, if invalid go back to step_one.
From step_two, clicking next goes to validating_two.
From validating_two, if valid go to step_three.
From validating_two, if invalid go back to step_two.
From step_two, clicking back goes to step_one.
From step_three, clicking submit goes to submitting.
From step_three, clicking back goes to step_two.
From submitting, if success go to completed.
From submitting, if failure go to submit_error.
From submit_error, retrying goes to submitting.
Completed is the final state.
Submit_error is an error state.`
  },
  {
    id: 'traffic',
    title: 'Traffic Light',
    icon: '🚦',
    desc: '4 states — Cyclic state machine',
    text: `The traffic light starts at red.
From red, after timer expires go to green.
From green, after timer expires go to yellow.
From yellow, after timer expires go to red.
From any state, emergency overrides to flashing.
From flashing, emergency ends and goes to red.`
  }
];
