import { useEffect, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Affix, Button, Transition } from '@mantine/core';

/** 위에서 이만큼 (px) 넘게 내려가 있으면 "맨 위로", 아니면 "맨 밑으로" */
const TOP_ZONE = 300;
/** 화면 오른쪽 아래에서 띄우는 거리 (px) */
const EDGE_GAP = 20;

type Jump = 'top' | 'bottom' | null;

interface ScrollTopButtonProps {
  /** 스크롤하는 상자. 없으면 페이지 (window) */
  target?: RefObject<HTMLElement | null>;
}

/**
 * 오른쪽 아래 이동 버튼: 위쪽에 있으면 "맨 밑으로", 내려가 있으면 "맨 위로".
 * 내릴 만큼 길지 않으면 보이지 않는다
 */
export default function ScrollTopButton({ target }: ScrollTopButtonProps) {
  const { t: translate } = useTranslation();
  const [jump, setJump] = useState<Jump>(null);
  useEffect(() => {
    const element = target?.current ?? null;
    const read = () => {
      const scrolled = element ? element.scrollTop : window.scrollY;
      const scrollable = element ? element.scrollHeight - element.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= TOP_ZONE) setJump(null);
      else setJump(scrolled > TOP_ZONE ? 'top' : 'bottom');
    };
    read();
    const source: HTMLElement | Window = element ?? window;
    source.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    // 내용이 바뀌어 길이가 달라져도 (다른 스탯 · 칩 · 펼치기) 다시 판단
    const observed = element ?? document.body;
    const mutations = new MutationObserver(read);
    mutations.observe(observed, { childList: true, subtree: true });
    return () => {
      source.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
      mutations.disconnect();
    };
  }, [target]);

  const go = () => {
    const scroller = target?.current ?? null;
    const top = jump === 'top' ? 0 : scroller ? scroller.scrollHeight : document.documentElement.scrollHeight;
    (scroller ?? window).scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <Affix position={{ bottom: EDGE_GAP, right: EDGE_GAP }}>
      <Transition transition="slide-up" mounted={jump !== null}>
        {(transitionStyles) => (
          <Button style={transitionStyles} radius="xl" onClick={go}>
            {translate(jump === 'bottom' ? 'common.scrollBottom' : 'common.scrollTop')}
          </Button>
        )}
      </Transition>
    </Affix>
  );
}
