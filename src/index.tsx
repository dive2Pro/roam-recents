import React, { useRef } from "react";
import ReactDOM from "react-dom";
import {
  Button,
  ButtonGroup,
  ControlGroup,
  Icon,
  Tab,
  Tabs,
  Toaster,
} from "@blueprintjs/core";
import { initConfig, maxLength } from "./config";
import "./style.less";
declare global {
  interface Window {
    roamAlphaAPI: any;
  }
}

const getCurrentPageInfo = async () => {
  let current_uid =
    await window.roamAlphaAPI.ui.mainWindow.getOpenPageOrBlockUid();
  if (!current_uid) {
    throw new Error("not in page");
  }
  let pageInfo = window.roamAlphaAPI.q(`
        [
        :find  (pull ?c [ :block/uid :node/title ]) .
        :where
        [?b :block/uid "${current_uid}"]
        [?b :block/page ?c]
       
        ]
        `);
  if (pageInfo) {
    return pageInfo;
  }
  return window.roamAlphaAPI.q(`
        [
        :find  (pull ?c [ :block/uid :node/title ]) .
        :where
        [?c :block/uid "${current_uid}"]
       
       
        ]
        `);
};
const CACHE_KEY = "__roam_recents";

type Recent = {
  uid: string;
  title: string;
};
class Cache {
  sync(json: Recent[]) {
    // localStorage.setItem(CACHE_KEY, json);

    extensionAPI.settings.set(CACHE_KEY, json);
  }
  read() {
    try {
      return (extensionAPI.settings.get(CACHE_KEY) || []) as Recent[];
    } catch (e) {
      return [];
    }
  }
}

const cache = new Cache();

function History(props: { hide?: boolean }) {
  const [recents, setRecents] = React.useState(() => cache.read());
  const recentsRef = useRef(recents);
  recentsRef.current = recents;
  React.useEffect(() => {
    async function onHashChange() {
      const pageInfo = await getCurrentPageInfo();
      const recents = recentsRef.current;
      const found_index = recents.findIndex((item) => {
        return item.uid === pageInfo.uid;
      });
      if (found_index === -1) {
      } else {
        recents.splice(found_index, 1);
      }
      recents.unshift(pageInfo);
      const newRecents = recents.slice(0, maxLength());
      cache.sync(newRecents);
      setRecents([...newRecents]);
    }
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  if (props.hide) {
    return null;
  }
  return (
    <section className="roam-recents-el">
      {recents.map((recent, index) => {
        return (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const target = window.roamAlphaAPI.q(`
                  [
                    :find ?e .
                    :where
                    [?e :block/uid "${recent.uid}"]
                  ]
                `);
              if (!target) {
                recents.splice(index, 1);
                setRecents([...recents]);
                cache.sync([...recents]);
                Toaster.create({}).show({
                  intent: "warning",
                  message: `This page ${recent.title} has been deleted.`,
                });
                return;
              }
              if (e.shiftKey) {
                window.roamAlphaAPI.ui.rightSidebar.addWindow({
                  window: { type: "block", "block-uid": recent.uid },
                });
                return false;
              }
              window.roamAlphaAPI.ui.mainWindow.openPage({
                page: { uid: recent.uid },
              });
              return false;
            }}
          >
            <Button
              className="page"
              minimal
              fill
              active={false}
              alignText="left"
              rightIcon={
                <Button
                  icon={"cross"}
                  minimal
                  className="hover-visible"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    recents.splice(index, 1);
                    setRecents([...recents]);
                    cache.sync([...recents]);
                    return false;
                  }}
                ></Button>
              }
            >
              <div>{recent.title}</div>
            </Button>
          </a>
        );
      })}
    </section>
  );
}

function NavMenu() {
  const [active, setActive] = React.useState("star");
  const isActive = (_active: string) => {
    return active === _active;
  };
  // return (
  //   <ControlGroup fill  className="bp3-dark roam-recents-menus">
  //     <Button
  //       intent={isActive("star") ? "primary" : "none"}
  //       onClick={() => {
  //         setActive("star");
  //         ReactDOM.render(<History hide={true} />, div);
  //       }}
  //       outlined
  //       icon="star"
  //     >
  //       <small>Shortcuts</small>
  //     </Button>

  //     <Button
  //       intent={isActive("time") ? "primary" : "none"}
  //       outlined
  //       onClick={() => {
  //         setActive("time");
  //         ReactDOM.render(<History />, div);
  //       }}
  //       icon="time"
  //     >
  //       <small>Recents</small>
  //     </Button>
  //   </ControlGroup>
  // );
  return (
    // @ts-ignore
    <Tabs
      id="roam-recents-tabs"
      className="roam-recents-menus"
      selectedTabId={active}
    >
      <Tab
        id={"star"}
        title={
          <div
            className="bp3-tab flex gap-1.5"
            aria-selected={isActive("star")}
            onClick={() => {
              setActive("star");
              ReactDOM.render(<History hide={true} />, div);
            }}
          >
            <Icon icon="star" />
            <small>Shortcuts</small>
          </div>
        }
      />
      <Tab
        id={"time"}
        title={
          <div
            className="bp3-tab flex gap-1.5"
            aria-selected={isActive("time")}
            onClick={() => {
              setActive("time");
              ReactDOM.render(<History />, div);
            }}
          >
            <Icon icon="time"></Icon>
            <small>Recents</small>
          </div>
        }
      />
    </Tabs>
  );
}

let unload = () => {
  //
};
const div = document.createElement("div");
let extensionAPI: RoamExtensionAPI;
export default {
  onload(_extensionAPI: { extensionAPI: RoamExtensionAPI }) {
    extensionAPI = _extensionAPI.extensionAPI;
    initConfig(extensionAPI);
    const el_starred_pages = document.querySelector(".starred-pages");
    const el = el_starred_pages.previousElementSibling;
    const originNode = el.cloneNode(true);
    el_starred_pages.appendChild(div);
    ReactDOM.render(<NavMenu />, el);
    unload = () => {
      ReactDOM.unmountComponentAtNode(el);
      ReactDOM.unmountComponentAtNode(div);
      el.replaceWith(originNode);
    };
  },
  onunload() {
    unload();
  },
};
