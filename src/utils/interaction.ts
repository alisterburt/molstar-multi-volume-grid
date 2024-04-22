import {InputObserver} from "molstar/lib/mol-util/input/input-observer";
import {Camera} from "molstar/lib/mol-canvas3d/camera";

export function outsideViewport(input: InputObserver, camera: Camera, x: number, y: number) {
    const viewport = camera.viewport;
    x *= input.pixelRatio;
    y *= input.pixelRatio;
    return (
        x > viewport.x + viewport.width ||
        input.height - y > viewport.y + viewport.height ||
        x < viewport.x ||
        input.height - y < viewport.y
    );
}