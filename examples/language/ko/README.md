# ko 예제: 소재로 쓰는 동네 수필

이 디렉터리에서 writer-pi 실행:

```bash
cd examples/language/ko
writer-pi
```

대화 화면에서 입력:

```
/draft 동네 분식집에 대한 수필을 써 줘
```

brief.md에 조건(목표 언어, 장르, 분량, 금지어), sources/bunsik.md에 소재가 있다.
비대화형 실제 생성:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 동네 분식집에 대한 수필을 써 줘" --no-session
```

과정은 자동으로 진행: 초고 작성, 저장, 검사, 부분 수정.
최종본은 article.md이고 drafts/에 버전 파일이 있다.
