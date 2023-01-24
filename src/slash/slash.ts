import { FileLoader, LoadContext } from "@/core";
import { createSlashBuilder, createBaseBuilder } from "@/utils";
import {
    ChatInputCommandInteraction,
    SharedSlashCommandOptions,
    SlashCommandSubcommandBuilder,
} from "discord.js";
import {
    ApplicationCommandConfig,
    DescriptionConfig,
    File,
    Node,
} from "../types";
import type { InferOptionType, Option } from "./option";

type SlashOptionsConfig = { [key: string]: Option<any> };

export type SlashCommandConfig<O extends SlashOptionsConfig> =
    DescriptionConfig &
        ApplicationCommandConfig & {
            options?: O;
            execute: (
                context: SlashCommandInteractionContext<O>
            ) => void | Promise<void>;
        };

export type SlashCommandInteractionContext<O extends SlashOptionsConfig> = {
    event: ChatInputCommandInteraction;
    options: {
        [K in keyof O]: InferOptionType<O[K]>;
    };
};

export function slash<Options extends SlashOptionsConfig>(
    config: SlashCommandConfig<Options>
): SlashCommandFile {
    return new SlashCommandFile(config);
}

function initOptions<B extends SharedSlashCommandOptions>(
    builder: B,
    config: SlashCommandConfig<any>
): B {
    const options = config.options ?? {};

    for (const [name, info] of Object.entries<Option<never>>(options)) {
        builder.options.push(info.build(name));
    }

    return builder;
}

export class SlashCommandFile extends FileLoader {
    readonly config: SlashCommandConfig<any>;
    readonly optionMap: [string, Option<never>][];

    constructor(config: SlashCommandConfig<any>) {
        super();
        this.config = config;
        this.optionMap = Object.entries<Option<never>>(this.config.options);
    }

    onEvent = (e: ChatInputCommandInteraction) => {
        const options: any = {};

        for (const [key, option] of this.optionMap) {
            const v = e.options.get(key, option.config.required);

            options[key] = option.parse(v);
        }
        this.config.execute({
            event: e,
            options: options,
        });
    };

    override load({ name }: File, context: LoadContext) {
        const config = this.config;

        let command = createSlashBuilder(name, config);
        command = initOptions(command, config);

        context.listeners.slash.set([command.name, null, null], this.onEvent);
        context.commands.push(command);
    }

    loadSubCommand(
        { name }: File,
        context: LoadContext,
        key: [command: string, group: string | null]
    ): SlashCommandSubcommandBuilder {
        const config = this.config;

        let builder = createBaseBuilder(
            new SlashCommandSubcommandBuilder(),
            name,
            config
        );
        builder = initOptions(builder, config);

        context.listeners.slash.set([...key, builder.name], this.onEvent);
        return builder;
    }
}
