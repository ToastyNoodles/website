const clearColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };
const vertices = new Float32Array([
	-1.0, -1.0, 0.0, 0.0,
	 1.0, -1.0, 1.0, 0.0,
	 1.0,  1.0, 1.0, 1.0,
	 1.0,  1.0, 1.0, 1.0,
	-1.0,  1.0, 0.0, 1.0,
	-1.0, -1.0, 0.0, 0.0
]);

const shaders = 
`
struct VertexOut {
	@builtin(position) position : vec2f,
	@location(0) texCoord : vec2f
}

@vertex
fn vertex_main(@location(0) position : vec2f, @location(1) texCoord: vec2f) -> VertexOut
{
	var output : VertexOut;
	output.position = position;
	output.texCoord = texCoord;
	return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec2f
{
	return fragData
}
`

async function init()
{
	if (!navigator.gpu)
	{
		alert("WebGPU not supported. https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility");
	}

	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter)
	{
		alert("Could not request WebGPU adapter.");
	}

	const device = await adapter.requestDevice();

	const shaderModule = device.createShaderModule({
		code: shaders
	});

	const canvas = document.querySelector('#gpuCanvas');
	const context = canvas.getContext('webgpu');

	context.configure({
		device: device,
		format: navigator.gpu.getPreferredCanvasFormat(),
		alphaMode: 'premultiplied'
	});

	const vertexBuffer = device.createBuffer({
		size: vertices.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
	});

	device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

	const vertexBuffers = [{
		attributes: [{
			shaderLocation: 0,
			offset: 0,
			format: 'float32x2'
		}, {
			shaderLocation: 1,
			offset: 8,
			format: 'float32x2'
		}],
		arrayStride: 32,
		stepMode: 'vertex'
	}];

	const pipelineDescriptor = {
		vertex: {
			module: shaderModule,
			entryPoint: 'vertex_main',
			buffers: vertexBuffers
		},
		fragment: {
			module: shaderModule,
			entryPoint: 'fragment_main',
			targets: [{
				format: navigator.gpu.getPreferredCanvasFormat()
			}]
		},
		primitive: {
			topology: 'triangle-list'
		},
		layout: 'auto'
	};

	const renderPipeline = device.createRenderPipeline(pipelineDescriptor);
	const commandEncoder = device.createCommandEncoder();

	const renderPassDescriptor = {
		colorAttachments: [{
			clearValue: clearColor,
			loadOp: 'clear',
			storeOp: 'store',
			view: context.getCurrentTexture().createView()
		}]
	};

	const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

	passEncoder.setPipeline(renderPipeline);
	passEncoder.setVertexBuffer(0, vertexBuffer);
	passEncoder.draw(3);

	passEncoder.end();

	device.queue.submit([commandEncoder.finish()]);
}

window.onload = init;