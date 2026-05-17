"use client";

import { useState } from "react";
import Link from "next/link";

import { ChevronDown } from "@/util/icons/ChevronDown";
import English from "../../util/icons/english.webp";
import { useRouter } from "next/navigation";
import logo from "./favicon-512x512.png";
import save from "./floppy-disk-solid.svg";
import load from "./folder-open-solid.svg";
import {
  defaultState,
  GlobalStateContext,
} from "@/util/GlobalStateContextProvider";
import * as math from "mathjs";
import { GlobalState, SaveDataSchema } from "@/util/GlobalState";
import ExportedImage from "next-image-export-optimizer";
import { LockIcon } from "@/util/icons/LockIcon";
import { cyrb53 } from "@/util/Math";
import { ErrorMsg, ErrorMsgKeys, FailureMsg } from "@/util/UserMsgSystem";

import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";

import { Button } from "@heroui/button";

import { Avatar } from "@heroui/avatar";

import { Input } from "@heroui/input";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { confirmHelper, downloadFile } from "@/util/Util";
import { useContextSelector } from "use-context-selector";

async function onLinkClick(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
  if (window.location.pathname !== "/matrix") return false;
  const ok = await confirmHelper(
    "You have unsaved changes. Leaving will discard them. Continue?",
  );

  if (!ok) e.preventDefault();
}

export default function Index() {
  const router = useRouter();
  const [fileIsHovered, setFileIsHovered] = useState(false);
  const [settingsIsHovered, setSettingsIsHovered] = useState(false);
  const { globalState, setGlobalState } = useContextSelector(
    GlobalStateContext,
    ({ globalState, setGlobalState }) => ({
      globalState,
      setGlobalState,
    }),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwInvalid, setPwInvalid] = useState(false);

  return (
    <>
      <Navbar
        position="sticky"
        isBordered
        maxWidth="full"
        onMouseLeave={() => {
          setFileIsHovered(false);
          setSettingsIsHovered(false);
        }}
      >
        <NavbarBrand
          style={{ height: "100%", flexGrow: "0", aspectRatio: "1" }}
        >
          <ExportedImage
            src={logo}
            alt=""
            style={{ objectFit: "contain", height: "80%", width: "auto" }}
            unoptimized
          />
        </NavbarBrand>
        <NavbarContent className="sm:flex gap-4" justify="start">
          <input
            type="file"
            style={{ display: "none" }}
            id="file-picker-navbar"
            accept=".doe+"
            onChange={async (e) => {
              if (!e.target.files || e.target.files.length === 0) return;
              const file = e.target.files[0];
              // Reset files otherwise the same file cannot be loaded twice in a row because the onChange event is not triggered
              e.target.value = null!;
              const ok = await confirmHelper(
                "Loading a project will overwrite your current project including all measurements and settings. Make sure to save first if you want to keep it.",
              );
              if (!ok) return;

              if (file) {
                const reader = new FileReader();
                reader.readAsText(file, "UTF-8");
                reader.onload = function (evt) {
                  try {
                    const parsedGlobalState = SaveDataSchema.parse(
                      JSON.parse(evt.target!.result as string, math.reviver),
                    );
                    //Recompile the equations because functions are not serialized
                    const data: GlobalState = {
                      ...defaultState,
                      ...parsedGlobalState,
                      transformEquation: math
                        .parse(parsedGlobalState.rawFactorInput)
                        .compile(),
                      retransformEquation: math
                        .parse(parsedGlobalState.rawRetransformInput)
                        .compile(),
                    };
                    setGlobalState(data);
                  } catch (error) {
                    new FailureMsg(
                      `Your safe file is not a doe+ project or might have been corrupted. Was it created by an old version of doe+ simulator? Info: ${error}`,
                    );
                  }
                };

                reader.onerror = function () {
                  new FailureMsg(
                    "There was a filesystem error loading the file. Please try again",
                  );
                };
              }
            }}
          />
          <Dropdown
            isOpen={fileIsHovered}
            onMouseLeave={() => setFileIsHovered(false)}
          >
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  radius="sm"
                  variant="light"
                  style={{
                    fontSize: "var(--nextui-font-size-medium)",
                    lineHeight: "var(--nextui-line-height-medium)",
                  }}
                  endContent={<ChevronDown fill="currentColor" size={16} />}
                  onMouseEnter={() => setFileIsHovered(true)}
                >
                  File
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu
              itemClasses={{
                base: "gap-4",
              }}
              onAction={(key) => {
                switch (key) {
                  case "save": {
                    try {
                      if (ErrorMsg.isInErrorState()) {
                        new FailureMsg(
                          "Please fix the errors before exporting the project.",
                        );
                        return false;
                      }
                      const exportData: GlobalState = globalState;
                      const parsed = SaveDataSchema.parse(exportData);
                      downloadFile(
                        new Blob([JSON.stringify(parsed, math.replacer)], {
                          type: "application/json",
                        }),
                        "application/json",
                        "project.doe+",
                        "doe+ project file",
                      );
                    } catch (error) {
                      ErrorMsg.setError(
                        ErrorMsgKeys.ProjectSaveFailed,
                        `Saving the file failed due to a programming error. The SaveDataSchema was not fullfilled: ${error}`,
                      );
                    }

                    break;
                  }

                  case "load":
                    document.getElementById("file-picker-navbar")!.click();
                    break;
                }
              }}
            >
              <DropdownItem
                key="save"
                startContent={
                  <ExportedImage
                    src={save}
                    alt="Save icon"
                    style={{ width: "30px" }}
                    unoptimized
                  />
                }
              >
                Save project
              </DropdownItem>
              <DropdownItem
                key="load"
                startContent={
                  <ExportedImage
                    src={load}
                    alt="Load icon"
                    style={{ width: "30px" }}
                    unoptimized
                  />
                }
              >
                Load project
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <NavbarItem>
            <Link onClick={onLinkClick} href="/simulation">
              Simulation
            </Link>
          </NavbarItem>

          <Dropdown
            isOpen={settingsIsHovered && globalState.unlocked}
            onMouseLeave={() => setSettingsIsHovered(false)}
          >
            <NavbarItem>
              <DropdownTrigger>
                <Button
                  disableRipple
                  className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                  radius="sm"
                  variant="light"
                  style={{
                    fontSize: "var(--nextui-font-size-medium)",
                    lineHeight: "var(--nextui-line-height-medium)",
                  }}
                  endContent={
                    globalState.unlocked ? (
                      <ChevronDown fill="currentColor" size={16} />
                    ) : (
                      <LockIcon fill="currentColor" />
                    )
                  }
                  onMouseEnter={() => setSettingsIsHovered(true)}
                  // Dont change to onPress, because this deprecation warning is wrong and it will break the code
                  onClick={() => {
                    if (!globalState.unlocked) setModalOpen(true);
                  }}
                >
                  Settings
                </Button>
              </DropdownTrigger>
            </NavbarItem>
            <DropdownMenu
              itemClasses={{
                base: "gap-4",
              }}
              onAction={(key) => router.push(`/settings/${key}`)}
            >
              <DropdownItem key="factors">Factors</DropdownItem>
              <DropdownItem key="targets">Targets</DropdownItem>
              <DropdownItem key="retransformedtargets">
                Retransformed Targets
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          <NavbarItem>
            <Link onClick={onLinkClick} href="/measurements">
              Measurements
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link onClick={onLinkClick} href="/pairwisecomparison">
              Pairwise Comparison
            </Link>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent as="div" className="items-center" justify="end">
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                color="secondary"
                size="sm"
                src={English.src}
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
              <DropdownItem
                key="english"
                startContent={
                  <ExportedImage
                    src={English}
                    alt="English language icon"
                    style={{ width: "30px" }}
                    unoptimized
                  />
                }
              >
                English
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>
      </Navbar>
      <Modal size="xs" isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalContent>
          {(onClose) => (
            // avoid page reload with action
            <form
              action="javascript:void(0);"
              onSubmit={() => {
                if (cyrb53(pwInput) === 3327862314679739) {
                  setGlobalState((previousState) => ({
                    ...previousState,
                    unlocked: true,
                  }));
                  setPwInvalid(false);
                  onClose();
                } else setPwInvalid(true);
                return false; // Should help with no page reload but didnt work in firefox, so added it to the action attribute of the form as well
              }}
            >
              <ModalHeader className="flex flex-col gap-1">
                Unlock settings
              </ModalHeader>
              <ModalBody>
                <Input
                  autoFocus
                  type="password"
                  isClearable
                  placeholder="Enter password"
                  label="Password"
                  onChange={(v) => {
                    setPwInput(v.target.value);
                    setPwInvalid(false);
                  }}
                  isInvalid={pwInvalid}
                  errorMessage="The password is wrong"
                />
                {/** https://stackoverflow.com/a/27808062 submit on enter */}
                <input type="submit" style={{ display: "none" }} />
              </ModalBody>
              <ModalFooter>
                <Button color="primary" type="submit">
                  Verify password
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
