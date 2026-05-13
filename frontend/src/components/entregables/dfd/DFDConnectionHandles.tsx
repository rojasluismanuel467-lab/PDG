"use client";

import { Handle, Position } from "@xyflow/react";

interface DFDConnectionHandlesProps {
  isConnectable?: boolean;
  visible?: boolean;
  revealOnHover?: boolean;
}

const HANDLE_BASE_CLASS =
  "!h-3.5 !w-3.5 !border-2 !border-white !bg-[#1f2937] !rounded-full !transition-opacity !duration-150";

export default function DFDConnectionHandles({
  isConnectable = true,
  visible = false,
  revealOnHover = true,
}: DFDConnectionHandlesProps) {
  const visibilityClass = visible
    ? revealOnHover
      ? "!opacity-0 group-hover:!opacity-100 [&.connecting]:!opacity-100 [&.valid]:!opacity-100 !pointer-events-auto"
      : "!opacity-100 !pointer-events-auto"
    : "!opacity-0 !pointer-events-none";
  const handleClass = `${HANDLE_BASE_CLASS} ${visibilityClass}`;

  return (
    <>
      {/* Left */}
      <Handle
        id="target-left-top"
        type="source"
        position={Position.Left}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ top: "32%" }}
        className={handleClass}
      />
      <Handle
        id="source-left-bottom"
        type="source"
        position={Position.Left}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ top: "68%" }}
        className={handleClass}
      />

      {/* Right */}
      <Handle
        id="source-right-top"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ top: "32%" }}
        className={handleClass}
      />
      <Handle
        id="target-right-bottom"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ top: "68%" }}
        className={handleClass}
      />

      {/* Top */}
      <Handle
        id="target-top-left"
        type="source"
        position={Position.Top}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ left: "34%" }}
        className={handleClass}
      />
      <Handle
        id="source-top-right"
        type="source"
        position={Position.Top}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ left: "66%" }}
        className={handleClass}
      />

      {/* Bottom */}
      <Handle
        id="source-bottom-left"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ left: "34%" }}
        className={handleClass}
      />
      <Handle
        id="target-bottom-right"
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        isConnectableStart={isConnectable}
        isConnectableEnd={isConnectable}
        style={{ left: "66%" }}
        className={handleClass}
      />
    </>
  );
}
