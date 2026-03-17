/*
 * IBM Confidential
 * OCO Source Materials
 * 5737-D18, 5725-D10
 *
 * (C) Copyright International Business Machines Corp. 2022, 2023
 *
 * The source code for this program is not published or otherwise divested
 * of its trade secrets, irrespective of what has been deposited with the
 * U.S. Copyright Office.
 */

import { get } from "lodash";
import { Constants } from "../common/return.constants";
import { MashupMapperResponse, MashupMapperResponseChain, MashupResponseMapper } from "../state/mashup/mashup-rsp-processor.service";
import { Note } from "../state/types/return.interface";

export class NoteMapper implements MashupResponseMapper {

    private readonly NOTES_PATH = 'Notes.Note';
    private readonly ORDER_PURPOSE_PATH = 'OrderPurpose';

    mapResponse(mashupResponse: Record<string, any> | Record<string, any>[], mashupMapperChain: MashupMapperResponseChain): MashupMapperResponse {
        const mapperResponse: MashupMapperResponse = {
            entities: [],
            actions: []
        };
        if (Array.isArray(mashupResponse)) {
            mashupResponse.forEach(mr => {
                const notes = get(mr.response.Order, this.NOTES_PATH, []);
                const orderPurpose = get(mr.response.Order, this.ORDER_PURPOSE_PATH, []);
                notes.forEach(note => mapperResponse.entities.push(this.mapNote(note, orderPurpose)))
            });
        }
        return mapperResponse;
    }

    public mapNote(note: Record<string, any>, orderPurpose?: string): Note {
        return {
            entity_type: orderPurpose && orderPurpose === "EXCHANGE" ? Constants.ENTITY_TYPE_EXCHANGE_NOTES : Constants.ENTITY_TYPE_NOTE,
            id: note.SequenceNo,
            notesKey: note.NotesKey,
            tableKey: note.TableKey,
            rawData: note,
            contactReference: note.ContactReference,
            contactTime: note.ContactTime,
            contactType: note.ContactType,
            contactUser: note.ContactUser,
            customerSatIndicator: note.CustomerSatIndicator,
            noteText: note.NoteText,
            priority: note.Priority,
            reasonCode: note.ReasonCode,
            sequenceNo: note.SequenceNo,
            user: note.User?.Username,
            visibleToAll: note.VisibleToAll,
            modifyts: note.Modifyts,
            createts: note.Createts,
            modifyuserid: note.Modifyuserid,
            createuserid: note.Createuserid,
            modifyUserName: note.ModifyUserName ?? note.Modifyuserid,
        }
    }
}
