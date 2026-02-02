let gl;
let canvas;
let a_Position;
let u_ModelMatrix;
let u_GlobalRotation;
let u_Color;
let globalRotationAngle = 0;
let upperArmAngle = 0;
let lowerArmAngle = 0;
let isAnimating = false;
let currentTime = 0;
let cubeBuffer;
let cubeVertexCount;
let mouseXRotation = 0;
let mouseYRotation = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// FPS counter
let lastFPSTime = performance.now();
let frames = 0;

const VSHADER = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotation;
void main() {
  gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
}
`;

const FSHADER = `
precision mediump float;
uniform vec4 u_Color;
void main() { gl_FragColor = u_Color; }
`;

function main() {
  // Get the canvas element
  canvas = document.getElementById('webgl');
  
  // Get WebGL context
  gl = canvas.getContext('webgl');

  // Initialize shaders
  initShaders(gl, VSHADER, FSHADER);

  // Get attribute and uniform locations
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  u_Color = gl.getUniformLocation(gl.program, 'u_Color');

  // Enable depth testing so things in front appear in front
  gl.enable(gl.DEPTH_TEST);
  
  // Set background color to black
  gl.clearColor(0, 0, 0, 1);

  // Setup the cube
  initCube();
  
  // Setup UI controls
  setupUI();
  
  // Setup mouse controls
  setupMouse();
  
  // Start the animation loop
  tick();
}

// Initialize cube vertices
function initCube() {
  // All the vertices for a cube (36 vertices = 6 faces * 2 triangles * 3 vertices)
  const vertices = new Float32Array([
    // Front face
    -0.5, -0.5, 0.5,  0.5, -0.5, 0.5,  0.5, 0.5, 0.5,
    -0.5, -0.5, 0.5,  0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,
    
    // Back face
    -0.5, -0.5, -0.5,  -0.5, 0.5, -0.5,  0.5, 0.5, -0.5,
    -0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  0.5, -0.5, -0.5,
    
    // Left face
    -0.5, -0.5, -0.5,  -0.5, -0.5, 0.5,  -0.5, 0.5, 0.5,
    -0.5, -0.5, -0.5,  -0.5, 0.5, 0.5,  -0.5, 0.5, -0.5,
    
    // Right face
    0.5, -0.5, -0.5,  0.5, 0.5, -0.5,  0.5, 0.5, 0.5,
    0.5, -0.5, -0.5,  0.5, 0.5, 0.5,  0.5, -0.5, 0.5,
    
    // Top face
    -0.5, 0.5, -0.5,  -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
    -0.5, 0.5, -0.5,  0.5, 0.5, 0.5,  0.5, 0.5, -0.5,
    
    // Bottom face
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5, 0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5, 0.5,  -0.5, -0.5, 0.5
  ]);
  
  // How many vertices do we have?
  cubeVertexCount = vertices.length / 3;
  
  // Create buffer
  cubeBuffer = gl.createBuffer();
  
  // Bind buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  
  // Put data in buffer
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

// Function to draw a cube with a matrix and color
function drawCube(matrix, color) {
  // Bind the cube buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  
  // Tell WebGL how to pull out the positions
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  
  // Enable the attribute
  gl.enableVertexAttribArray(a_Position);
  
  // Set the matrix
  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  
  // Set the color
  gl.uniform4fv(u_Color, color);
  
  // Draw the cube
  gl.drawArrays(gl.TRIANGLES, 0, cubeVertexCount);
}

// Draw the whole scene
function renderScene() {
  // Clear the screen
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create global rotation matrix
  let globalMatrix = new Matrix4();
  globalMatrix.rotate(globalRotationAngle + mouseXRotation, 0, 1, 0);
  globalMatrix.rotate(mouseYRotation, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalMatrix.elements);

  // Base scale for everything
  let baseMatrix = new Matrix4();
  baseMatrix.scale(0.4, 0.4, 0.4);

  // Draw the body (torso) - skinnier and longer
  let bodyMatrix = new Matrix4(baseMatrix);
  bodyMatrix.scale(1.5, 0.7, 0.6); 
  drawCube(bodyMatrix, [0.6, 0.5, 0.4, 1]);

  // Draw the head
  let headMatrix = new Matrix4(baseMatrix);
  headMatrix.translate(1.0, 0.2, 0);
  headMatrix.scale(0.6, 0.6, 0.6);
  drawCube(headMatrix, [0.65, 0.55, 0.45, 1]);

  // Draw the snout/face
  let snoutMatrix = new Matrix4(baseMatrix);
  snoutMatrix.translate(1.4, 0.1, 0);
  snoutMatrix.scale(0.3, 0.4, 0.4);
  drawCube(snoutMatrix, [0.7, 0.6, 0.5, 1]);

  // Draw the left eye
  let eye1Matrix = new Matrix4(baseMatrix);
  eye1Matrix.translate(1.35, 0.35, 0.25);
  eye1Matrix.scale(0.1, 0.1, 0.05);
  drawCube(eye1Matrix, [0.1, 0.05, 0.0, 1]);

  // Draw the right eye
  let eye2Matrix = new Matrix4(baseMatrix);
  eye2Matrix.translate(1.35, 0.35, -0.25);
  eye2Matrix.scale(0.1, 0.1, 0.05);
  drawCube(eye2Matrix, [0.1, 0.05, 0.0, 1]);

  // Draw the nose
  let noseMatrix = new Matrix4(baseMatrix);
  noseMatrix.translate(1.65, 0.05, 0);
  noseMatrix.scale(0.08, 0.08, 0.1);
  drawCube(noseMatrix, [0.2, 0.15, 0.1, 1]);

  // Draw the right arm (side = 0.5)
  drawArm(bodyMatrix, 0.5, true); 
  
  // Draw the left arm (side = -0.5)
  drawArm(bodyMatrix, -0.5, true); 

  // Draw the right leg (side = 0.4)
  drawLeg(bodyMatrix, 0.4); 
  
  // Draw the left leg (side = -0.4)
  drawLeg(bodyMatrix, -0.4); 
}

// Function to draw an arm
function drawArm(baseMatrix, sidePosition, isBent) {
  // Upper arm
  let upperArmMatrix = new Matrix4(baseMatrix);
  upperArmMatrix.translate(0.5, 0, sidePosition); 
  upperArmMatrix.rotate(upperArmAngle, 1, 0, 0); 
  
  // Make right and left arms mirror each other
  if (sidePosition > 0) {
    upperArmMatrix.rotate(-90, 1, 0, 0);
  } else {
    upperArmMatrix.rotate(90, 1, 0, 0);
  }
  
  upperArmMatrix.scale(0.25, 0.8, 0.25);
  drawCube(upperArmMatrix, [0.55, 0.45, 0.35, 1]);

  // Lower arm
  let lowerArmMatrix = new Matrix4(upperArmMatrix);
  lowerArmMatrix.translate(0, -1.0, 0);
  lowerArmMatrix.rotate(lowerArmAngle, 1, 0, 0);
  
  if (isBent == true) {
    lowerArmMatrix.rotate(20, 1, 0, 0);
  }
  
  lowerArmMatrix.scale(0.9, 0.9, 0.9);
  drawCube(lowerArmMatrix, [0.5, 0.4, 0.3, 1]);

  // Hand
  let handMatrix = new Matrix4(lowerArmMatrix);
  handMatrix.translate(0, -0.8, 0);
  handMatrix.scale(1.1, 0.3, 1.1);
  drawCube(handMatrix, [0.45, 0.35, 0.25, 1]);

  // Claw 1
  let claw1Matrix = new Matrix4(handMatrix);
  claw1Matrix.translate(-0.3, -0.5, 0.3);
  claw1Matrix.rotate(10, 1, 0, 0);
  claw1Matrix.scale(0.15, 0.6, 0.1);
  drawCube(claw1Matrix, [0.2, 0.2, 0.2, 1]);

  // Claw 2
  let claw2Matrix = new Matrix4(handMatrix);
  claw2Matrix.translate(0, -0.5, 0.3);
  claw2Matrix.rotate(10, 1, 0, 0);
  claw2Matrix.scale(0.15, 0.6, 0.1);
  drawCube(claw2Matrix, [0.2, 0.2, 0.2, 1]);

  // Claw 3
  let claw3Matrix = new Matrix4(handMatrix);
  claw3Matrix.translate(0.3, -0.5, 0.3);
  claw3Matrix.rotate(10, 1, 0, 0);
  claw3Matrix.scale(0.15, 0.6, 0.1);
  drawCube(claw3Matrix, [0.2, 0.2, 0.2, 1]);
}

// Function to draw a leg
function drawLeg(baseMatrix, sidePosition) {
  // Upper leg
  let upperLegMatrix = new Matrix4(baseMatrix);
  upperLegMatrix.translate(-0.4, 0, sidePosition); 
  
  // Make right and left legs mirror each other
  if (sidePosition > 0) {
    upperLegMatrix.rotate(-90, 1, 0, 0);
  } else {
    upperLegMatrix.rotate(90, 1, 0, 0);
  }
  
  upperLegMatrix.scale(0.3, 0.7, 0.3);
  drawCube(upperLegMatrix, [0.55, 0.45, 0.35, 1]);

  // Lower leg
  let lowerLegMatrix = new Matrix4(upperLegMatrix);
  lowerLegMatrix.translate(0, -0.8, 0);
  
  // Bend the legs opposite ways
  if (sidePosition > 0) {
    lowerLegMatrix.rotate(-20, 1, 0, 0);
  } else {
    lowerLegMatrix.rotate(20, 1, 0, 0);
  }
  
  lowerLegMatrix.scale(0.85, 0.85, 0.85);
  drawCube(lowerLegMatrix, [0.5, 0.4, 0.3, 1]);

  // Foot
  let footMatrix = new Matrix4(lowerLegMatrix);
  footMatrix.translate(0, -0.7, 0);
  footMatrix.scale(1.0, 0.3, 1.1);
  drawCube(footMatrix, [0.45, 0.35, 0.25, 1]);

  // Foot claw 1
  let footClaw1Matrix = new Matrix4(footMatrix);
  footClaw1Matrix.translate(-0.3, -0.4, 0.3);
  footClaw1Matrix.rotate(10, 1, 0, 0);
  footClaw1Matrix.scale(0.15, 0.5, 0.1);
  drawCube(footClaw1Matrix, [0.2, 0.2, 0.2, 1]);

  // Foot claw 2
  let footClaw2Matrix = new Matrix4(footMatrix);
  footClaw2Matrix.translate(0, -0.4, 0.3);
  footClaw2Matrix.rotate(10, 1, 0, 0);
  footClaw2Matrix.scale(0.15, 0.5, 0.1);
  drawCube(footClaw2Matrix, [0.2, 0.2, 0.2, 1]);

  // Foot claw 3
  let footClaw3Matrix = new Matrix4(footMatrix);
  footClaw3Matrix.translate(0.3, -0.4, 0.3);
  footClaw3Matrix.rotate(10, 1, 0, 0);
  footClaw3Matrix.scale(0.15, 0.5, 0.1);
  drawCube(footClaw3Matrix, [0.2, 0.2, 0.2, 1]);
}

// Update the animation angles
function updateAnimation() {
  upperArmAngle = 15 * Math.sin(currentTime);
  lowerArmAngle = 25 * Math.sin(currentTime + 1);
}

// Animation loop
function tick() {
  // Get current time in seconds
  currentTime = performance.now() / 1000;
  
  // If animation is on, update the angles
  if (isAnimating == true) {
    updateAnimation();
  }
  
  // Draw the scene
  renderScene();
  
  // Update FPS counter
  updateFPS();
  
  // Call tick again next frame
  requestAnimationFrame(tick);
}

// Setup UI controls
function setupUI() {
  // Global rotation slider
  document.getElementById('globalRotSlider').oninput = function(event) {
    globalRotationAngle = event.target.value;
  };
  
  // Upper arm slider
  document.getElementById('upperArmSlider').oninput = function(event) {
    upperArmAngle = event.target.value;
  };
  
  // Lower arm slider
  document.getElementById('lowerArmSlider').oninput = function(event) {
    lowerArmAngle = event.target.value;
  };
  
  // Animation button
  document.getElementById('animButton').onclick = function() {
    isAnimating = !isAnimating;
  };
}

// Setup mouse controls
function setupMouse() {
  // When mouse button is pressed
  canvas.onmousedown = function(event) {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  };
  
  // When mouse button is released
  canvas.onmouseup = function(event) {
    isDragging = false;
  };
  
  // When mouse moves
  canvas.onmousemove = function(event) {
    if (isDragging == true) {
      mouseXRotation = mouseXRotation + (event.clientX - lastMouseX) * 0.5;
      mouseYRotation = mouseYRotation + (event.clientY - lastMouseY) * 0.5;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    }
  };
  
  // When canvas is clicked with shift key
  canvas.onclick = function(event) {
    if (event.shiftKey == true) { 
      upperArmAngle = upperArmAngle + 30;
      lowerArmAngle = lowerArmAngle - 20;
    }
  };
}

// Update the FPS counter
function updateFPS() {
  frames = frames + 1;
  let currentFPSTime = performance.now();
  
  if (currentFPSTime - lastFPSTime >= 1000) {
    document.getElementById('perf').innerText = 'FPS: ' + frames;
    frames = 0;
    lastFPSTime = currentFPSTime;
  }
}

// Start the program
main();