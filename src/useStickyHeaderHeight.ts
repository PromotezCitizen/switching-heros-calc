import { useLayoutEffect, useRef } from 'react';
import { CONSTS } from '@/CONSTS';

/**
 * 위쪽에 고정한 줄의 실제 높이를 재서 CSS 변수로 알려 준다.
 * 그 아래에 붙여 고정하는 줄(하위 탭)이 이 변수를 쓰면 틈 없이 붙는다 (글꼴·화면 크기가 달라도 맞음)
 */
export function useStickyHeaderHeight<T extends HTMLElement>(cssVariableName: string = CONSTS.display.STICKY_HEADER_HEIGHT_VAR) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const publish = () =>
      document.documentElement.style.setProperty(cssVariableName, `${element.getBoundingClientRect().height}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cssVariableName]);
  return ref;
}
