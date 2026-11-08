import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { Tabs } from '@mantine/core';
import { SLIDE_TAB_LIST_STYLE } from '@/components/slideTabs';

/** 이만큼 (px) 넘게 움직여야 끌기로 본다 (그보다 적으면 탭 누르기) */
const DRAG_THRESHOLD = 5;

/**
 * 한 줄로 두고 옆으로 미는 탭 줄. 손가락은 그냥 밀리고, 마우스는 누른 채 끌거나 휠을 굴려 민다
 * (스크롤바를 숨겨서 마우스로는 밀 방법이 없었다). 끌었을 때는 탭이 눌리지 않는다
 */
export default function SlideTabsList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  // 세로 휠 → 가로 이동 (줄이 넘칠 때만, 가로 휠은 그대로)
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (element.scrollWidth <= element.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      element.scrollLeft += event.deltaY;
      event.preventDefault();
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || !ref.current) return;
    drag.current = { x: event.clientX, left: ref.current.scrollLeft, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || !ref.current) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) > DRAG_THRESHOLD) state.moved = true;
    if (state.moved) ref.current.scrollLeft = state.left - dx;
  };
  const onPointerEnd = () => {
    // 끌었으면 이어지는 click 을 막으려고 남겨 두고, 아니면 바로 지운다
    if (drag.current && !drag.current.moved) drag.current = null;
  };
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (drag.current?.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
    drag.current = null;
  };

  return (
    <Tabs.List
      ref={ref}
      style={SLIDE_TAB_LIST_STYLE}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onClickCapture={onClickCapture}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </Tabs.List>
  );
}
